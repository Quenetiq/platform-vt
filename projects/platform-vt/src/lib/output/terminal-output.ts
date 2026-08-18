import type { VTNode } from '../renderer/vt-node';
import type { LayoutNode } from '../layout/layout-node';
import { cursor, erase, reset } from './ansi';
import { resolveColorRgb, wrapColorRgb } from './color-map';
import { wrapText } from './wrap-text';

/** A viewport rectangle used to clip scrolled content. */
interface ClipRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Options controlling a single {@link TerminalOutput.render} pass.
 */
export interface TerminalRenderOptions {
  /**
   * Whether to clear the screen and reset the cursor before painting.
   * Defaults to `true`. Pass `false` when painting a layer on top of a
   * previous render (e.g. overlays): the layer then paints over the
   * existing screen content, which gives overlays their z-order.
   */
  clear?: boolean;
}

/**
 * Renders a layout tree to ANSI escape sequences and writes them to stdout.
 *
 * This is the final stage of the render pipeline:
 * 1. Layout engine produces a positioned {@link LayoutNode} tree
 * 2. This class traverses the tree and generates ANSI escape sequences
 * 3. The output is written to `process.stdout`
 *
 * Handles background fills, borders, text alignment, and style application.
 */
export class TerminalOutput {
  private buffer: string[] = [];

  /**
   * Render a layout tree to the terminal.
   *
   * @param layoutTree - The positioned layout tree from FlexLayout.
   * @param _columns - Terminal width (used for future viewport clipping).
   * @param _rows - Terminal height (used for future viewport clipping).
   * @param options - Render options, e.g. skipping the screen clear.
   */
  render(layoutTree: LayoutNode, _columns: number, _rows: number, options?: TerminalRenderOptions): void {
    this.buffer = [];

    const clear = options?.clear ?? true;
    if (clear) {
      this.buffer.push(cursor.hide());
      this.buffer.push(erase.screen());
      this.buffer.push(cursor.moveTo(0, 0));
    }

    this.renderNode(layoutTree, '', null);

    this.buffer.push(reset());
    this.buffer.push(cursor.show());

    if (typeof process !== 'undefined') {
      process.stdout.write(this.buffer.join(''));
    }
  }

  private renderNode(node: LayoutNode, inheritedBg = '', clip: ClipRect | null = null): void {
    const { vtNode, x, y, width, height } = node;

    if (vtNode.styles.get('display') === 'none') return;
    if (width <= 0 || node.height <= 0) return;

    if (vtNode.type === 'text') {
      this.renderText(vtNode, x, y, width, inheritedBg, clip);
      return;
    }

    if (vtNode.type === 'comment') return;

    const ownBg = vtNode.styles.get('backgroundColor');
    const bgColor =
      typeof ownBg === 'string' && ownBg.length > 0 ? ownBg : inheritedBg;

    // Render background fill (before anything else)
    if (ownBg !== inheritedBg && typeof ownBg === 'string' && ownBg.length > 0) {
      this.renderBackground(node, inheritedBg, clip);
    }

    // Render border (only if there's actual content area)
    const border = vtNode.styles.get('border');
    const borderLeft = vtNode.styles.get('borderLeft');
    const hasBorder =
      (typeof border === 'string' && border.length > 0) ||
      (typeof borderLeft === 'string' && borderLeft.length > 0);
    if (hasBorder && node.width >= 2 && node.height >= 2) {
      this.renderBorder(node, bgColor, clip);
    }

    // Children of a scroll container are clipped to its viewport box.
    const childClip =
      vtNode.styles.get('overflow') === 'scroll'
        ? { x, y, width, height }
        : clip;

    // Render children
    const children = node.children;

    // If element has explicit textContent, render it instead of children
    let textContent = vtNode.textContent;
    if (textContent.length === 0 && children.length === 1 && children[0].vtNode.type === 'text') {
      textContent = children[0].vtNode.textContent;
    }
    if (textContent.length > 0) {
      this.renderInlineText(node, textContent, bgColor, childClip);
    } else {
      for (const child of children) {
        this.renderNode(child, bgColor, childClip);
      }
    }
  }

  private renderText(
    node: VTNode,
    x: number,
    y: number,
    width: number,
    inheritedBg: string,
    clip: ClipRect | null,
  ): void {
    const wrap = node.styles.get('wrap') === 'wrap';
    const lines = wrap && width > 0 ? wrapText(node.textContent, width) : node.textContent.split('\n');
    const align = String(node.parent?.styles.get('textAlign') ?? 'left');

    for (let i = 0; i < lines.length; i++) {
      if (clip && (y + i < clip.y || y + i >= clip.y + clip.height)) continue;
      let line = lines[i];
      if (line.length > width) {
        line = line.substring(0, width);
      }
      line = this.alignText(line, width, align);
      const clipped = this.clipLine(line, x, clip);
      if (clipped === null) continue;
      line = this.applyStyles(clipped, node, inheritedBg);
      this.buffer.push(cursor.moveTo(x, y + i));
      this.buffer.push(line);
    }
  }

  private renderBackground(node: LayoutNode, inheritedBg: string, clip: ClipRect | null): void {
    const { x, y, width, height } = node;
    const bgColor = node.vtNode.styles.get('backgroundColor');
    if (typeof bgColor !== 'string') return;
    const code = resolveColorRgb(bgColor, 'bg');
    if (!code) return;

    const radius = Number(node.vtNode.styles.get('borderRadius') ?? 0);

    const fill = ' '.repeat(Math.max(0, width));

    // Visible row span within the clip viewport
    const rowStart = clip ? Math.max(0, clip.y - y) : 0;
    const rowEnd = clip ? Math.min(height, clip.y + clip.height - y) : height;
    if (rowEnd <= rowStart) return;

    const colStart = clip ? Math.max(0, clip.x - x) : 0;
    const colEnd = clip ? Math.min(width, clip.x + clip.width - x) : width;

    if (radius <= 0 || height < 2 || width < 2) {
      for (let row = rowStart; row < rowEnd; row++) {
        let fillRow = fill;
        if (colStart > 0 || colEnd < width) {
          fillRow = fillRow.substring(colStart, colEnd);
        }
        if (fillRow.length === 0) continue;
        this.buffer.push(cursor.moveTo(x + colStart, y + row));
        this.buffer.push(`${code}${fillRow}\x1b[49m`);
      }
      return;
    }

    // Rounded corners: paint rounded glyphs (in the block's color) at the four
    // corners over the surrounding background, and skip the corner cells in the
    // fill so the block reads as a rounded surface.
    const cornerBg = inheritedBg.length > 0 ? resolveColorRgb(inheritedBg, 'bg') : null;
    const paintCorner = (col: number, row: number, glyph: string): void => {
      if (clip && (y + row < clip.y || y + row >= clip.y + clip.height)) return;
      if (clip && (x + col < clip.x || x + col >= clip.x + clip.width)) return;
      let cell = wrapColorRgb(glyph, bgColor, 'fg');
      if (cornerBg) cell = `${cornerBg}${cell}\x1b[49m`;
      this.buffer.push(cursor.moveTo(x + col, y + row));
      this.buffer.push(cell);
    };

    const paintSpan = (fromCol: number, toCol: number, row: number): void => {
      if (clip && (y + row < clip.y || y + row >= clip.y + clip.height)) return;
      const f = Math.max(fromCol, colStart);
      const t = Math.min(toCol, colEnd);
      if (t <= f) return;
      this.buffer.push(cursor.moveTo(x + f, y + row));
      this.buffer.push(`${code}${' '.repeat(t - f)}\x1b[49m`);
    };

    // Top row (skip corner cells, then place the rounded corners)
    if (rowStart <= 0 && 0 < rowEnd) {
      paintSpan(1, width - 1, 0);
      paintCorner(0, 0, '\u256d');
      paintCorner(width - 1, 0, '\u256e');
    }
    // Interior rows
    for (let row = Math.max(1, rowStart); row < rowEnd && row < height - 1; row++) {
      paintSpan(0, width, row);
    }
    // Bottom row
    if (rowStart <= height - 1 && height - 1 < rowEnd) {
      paintSpan(1, width - 1, height - 1);
      paintCorner(0, height - 1, '\u2570');
      paintCorner(width - 1, height - 1, '\u256f');
    }
  }

  private renderBorder(node: LayoutNode, effectiveBg: string, clip: ClipRect | null): void {
    const borderStyle = node.vtNode.styles.get('border');
    const borderLeft = node.vtNode.styles.get('borderLeft');
    const { x, y, width, height } = node;
    if (width < 2 || height < 2) return;

    const radius = Number(node.vtNode.styles.get('borderRadius') ?? 0);
    const hasAll = typeof borderStyle === 'string' && borderStyle.length > 0;
    const hasLeft = typeof borderLeft === 'string' && borderLeft.length > 0;
    if (!hasAll && !hasLeft) return;

    const borderChars = this.getBorderChars(
      hasAll && typeof borderStyle === 'string' ? borderStyle : 'single',
    );

    const color = node.vtNode.styles.get('color');
    const paint = (s: string): string => {
      if (typeof color === 'string' && color.length > 0) {
        s = wrapColorRgb(s, color, 'fg');
      }
      if (effectiveBg.length > 0) {
        s = wrapColorRgb(s, effectiveBg, 'bg');
      }
      return s;
    };

    const rowVisible = (row: number): boolean =>
      !clip || (y + row >= clip.y && y + row < clip.y + clip.height);
    const colVisible = (col: number): boolean =>
      !clip || (x + col >= clip.x && x + col < clip.x + clip.width);

    // Left-only accent border (e.g. user messages)
    if (hasLeft && !hasAll) {
      const wide = borderLeft === 'thick';
      const bar = wide ? borderChars.vertical + borderChars.vertical : borderChars.vertical;
      for (let row = 0; row < height; row++) {
        if (!rowVisible(row)) continue;
        this.buffer.push(cursor.moveTo(x, y + row));
        this.buffer.push(paint(bar));
      }
      return;
    }

    // Rounded corners when border-radius is set
    const topLeft = radius > 0 ? '\u256d' : borderChars.topLeft;
    const topRight = radius > 0 ? '\u256e' : borderChars.topRight;
    const bottomLeft = radius > 0 ? '\u2570' : borderChars.bottomLeft;
    const bottomRight = radius > 0 ? '\u256f' : borderChars.bottomRight;

    // Top
    if (rowVisible(0) && colVisible(0)) {
      this.buffer.push(cursor.moveTo(x, y));
      this.buffer.push(paint(topLeft));
    }
    if (rowVisible(0)) {
      let from = 1;
      let to = width - 1;
      if (clip) {
        from = Math.max(from, clip.x - x);
        to = Math.min(to, clip.x + clip.width - x);
      }
      if (to > from) {
        this.buffer.push(cursor.moveTo(x + from, y));
        this.buffer.push(paint(borderChars.horizontal.repeat(to - from)));
      }
    }
    if (rowVisible(0) && colVisible(width - 1)) {
      this.buffer.push(cursor.moveTo(x + width - 1, y));
      this.buffer.push(paint(topRight));
    }

    // Sides
    for (let row = 1; row < height - 1; row++) {
      if (!rowVisible(row)) continue;
      if (colVisible(0)) {
        this.buffer.push(cursor.moveTo(x, y + row));
        this.buffer.push(paint(borderChars.vertical));
      }
      if (colVisible(width - 1)) {
        this.buffer.push(cursor.moveTo(x + width - 1, y + row));
        this.buffer.push(paint(borderChars.vertical));
      }
    }

    // Bottom
    const lastRow = height - 1;
    if (rowVisible(lastRow) && colVisible(0)) {
      this.buffer.push(cursor.moveTo(x, y + lastRow));
      this.buffer.push(paint(bottomLeft));
    }
    if (rowVisible(lastRow)) {
      let from = 1;
      let to = width - 1;
      if (clip) {
        from = Math.max(from, clip.x - x);
        to = Math.min(to, clip.x + clip.width - x);
      }
      if (to > from) {
        this.buffer.push(cursor.moveTo(x + from, y + lastRow));
        this.buffer.push(paint(borderChars.horizontal.repeat(to - from)));
      }
    }
    if (rowVisible(lastRow) && colVisible(width - 1)) {
      this.buffer.push(cursor.moveTo(x + width - 1, y + lastRow));
      this.buffer.push(paint(bottomRight));
    }
  }

  private getBorderChars(
    style: string,
  ): {
    topLeft: string;
    topRight: string;
    bottomLeft: string;
    bottomRight: string;
    horizontal: string;
    vertical: string;
  } {
    if (style === 'double') {
      return {
        topLeft: '\u2554',
        topRight: '\u2557',
        bottomLeft: '\u255a',
        bottomRight: '\u255d',
        horizontal: '\u2550',
        vertical: '\u2551',
      };
    }
    if (style === 'round') {
      return {
        topLeft: '\u256d',
        topRight: '\u256e',
        bottomLeft: '\u2570',
        bottomRight: '\u256f',
        horizontal: '\u2500',
        vertical: '\u2502',
      };
    }
    // Default: single
    return {
      topLeft: '\u250c',
      topRight: '\u2510',
      bottomLeft: '\u2514',
      bottomRight: '\u2518',
      horizontal: '\u2500',
      vertical: '\u2502',
    };
  }

  private renderInlineText(
    node: LayoutNode,
    textContent: string,
    inheritedBg: string,
    clip: ClipRect | null,
  ): void {
    const { vtNode, x, y, width, height } = node;

    const text = textContent;
    const lines = text.split('\n');
    const wrapped: string[] = [];
    const wrap = vtNode.styles.get('wrap') === 'wrap';

    for (const line of lines) {
      if (wrap && width > 0 && line.length > width) {
        const sub = wrapText(line, width);
        for (const l of sub) wrapped.push(l);
      } else {
        wrapped.push(line);
      }
    }

    const align = String(vtNode.styles.get('textAlign') ?? 'left');
    for (let i = 0; i < wrapped.length && i < height; i++) {
      if (clip && (y + i < clip.y || y + i >= clip.y + clip.height)) continue;
      let line = wrapped[i];
      if (line.length > width) line = line.substring(0, width);
      line = this.alignText(line, width, align);
      const clipped = this.clipLine(line, x, clip);
      if (clipped === null) continue;
      line = this.applyStyles(clipped, vtNode, inheritedBg);
      this.buffer.push(cursor.moveTo(x, y + i));
      this.buffer.push(line);
    }
  }

  private clipLine(line: string, x: number, clip: ClipRect | null): string | null {
    if (!clip) return line;
    if (x >= clip.x + clip.width) return null;
    if (x + line.length <= clip.x) return null;
    let s = line;
    let start = x;
    if (start < clip.x) {
      s = s.substring(clip.x - start);
      start = clip.x;
    }
    const max = clip.x + clip.width - start;
    if (s.length > max) s = s.substring(0, max);
    return s;
  }

  private alignText(
    text: string,
    width: number,
    align: string,
  ): string {
    if (text.length >= width) return text;

    const pad = width - text.length;
    switch (align) {
      case 'center': {
        const left = Math.floor(pad / 2);
        const right = pad - left;
        return ' '.repeat(left) + text + ' '.repeat(right);
      }
      case 'right':
        return ' '.repeat(pad) + text;
      case 'left':
      default:
        return text + ' '.repeat(pad);
    }
  }

  private applyStyles(text: string, node: VTNode, inheritedBg = ''): string {
    const color = node.styles.get('color');
    if (typeof color === 'string' && color.length > 0) {
      text = wrapColorRgb(text, color, 'fg');
    }

    const bgColor = node.styles.get('backgroundColor');
    const bg =
      typeof bgColor === 'string' && bgColor.length > 0 ? bgColor : inheritedBg;
    if (bg.length > 0) {
      text = wrapColorRgb(text, bg, 'bg');
    }

    if (node.styles.get('fontWeight') === 'bold') {
      text = `\x1b[1m${text}\x1b[22m`;
    }
    if (node.styles.get('fontStyle') === 'italic') {
      text = `\x1b[3m${text}\x1b[23m`;
    }
    if (node.styles.get('textDecoration') === 'underline') {
      text = `\x1b[4m${text}\x1b[24m`;
    }
    if (node.styles.get('textDecoration') === 'strikethrough') {
      text = `\x1b[9m${text}\x1b[29m`;
    }
    if (node.styles.get('opacity') === 'dim') {
      text = `\x1b[2m${text}\x1b[22m`;
    }

    return text;
  }
}
