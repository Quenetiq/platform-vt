import type { VTNode } from '../renderer/vt-node';
import type { LayoutNode } from '../layout/layout-node';
import { ScreenBuffer, emptyCell, type Cell, type CellRegion } from './screen-buffer';
import type { ColorMode } from './color-map';
import { wrapText } from './wrap-text';
import { stringWidth, cellWidth, truncateToWidth, dropCellsFromStart } from './unicode-width';

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
   * Whether to start a fresh frame (reset the virtual screen). Defaults to
   * `true`. Pass `false` when painting a layer on top of a previous render
   * (e.g. overlays): the layer then paints over the existing cells, which
   * gives overlays their z-order. Call {@link TerminalOutput.flush} after
   * painting all layers to write the diff to the terminal.
   */
  clear?: boolean;

  /**
   * The terminal's color capability, used to adapt `#hex`/`rgb()` colors to
   * 256 or 16 color terminals. Defaults to `'truecolor'`.
   */
  colorMode?: ColorMode;

  /**
   * A region to render with reverse video (text selection).
   */
  selection?: CellRegion | null;
}

/**
 * Renders layout trees into a virtual {@link ScreenBuffer} and diffs it
 * against the previous frame, writing only the changed cells to stdout.
 *
 * This is the final stage of the render pipeline:
 * 1. Layout engine produces a positioned {@link LayoutNode} tree
 * 2. This class paints it cell by cell into a virtual screen
 * 3. {@link flush} writes the ANSI diff of changed cells to `process.stdout`
 *
 * Handles background fills, borders, text alignment, style application,
 * wide (CJK/emoji) characters and OSC 8 hyperlinks.
 */
export class TerminalOutput {
  private readonly screen = new ScreenBuffer();
  private colorMode: ColorMode = 'truecolor';
  private selection: CellRegion | null = null;
  private framePainted = false;

  /**
   * Paint a layout tree into the virtual screen.
   *
   * @param layoutTree - The positioned layout tree from FlexLayout.
   * @param columns - Terminal width.
   * @param rows - Terminal height.
   * @param options - Render options, e.g. skipping the screen clear.
   */
  render(layoutTree: LayoutNode, columns: number, rows: number, options?: TerminalRenderOptions): void {
    this.colorMode = options?.colorMode ?? 'truecolor';
    this.selection = options?.selection ?? null;

    if (options?.clear ?? true) {
      this.screen.begin(columns, rows);
    }

    this.renderNode(layoutTree, '', null);
    this.framePainted = true;
  }

  /**
   * Write the current frame's diff to stdout (idempotent per frame).
   */
  flush(): void {
    if (!this.framePainted) return;
    this.framePainted = false;
    if (typeof process !== 'undefined') {
      process.stdout.write(this.flushToBuffer());
    }
  }

  /**
   * Compute the current frame's diff as a string without writing it.
   * Used by tests and snapshot tooling.
   */
  flushToBuffer(): string {
    this.framePainted = false;
    return this.screen.paint(this.colorMode);
  }

  /**
   * Extract the text of a region from the last painted frame.
   */
  text(region: CellRegion): string {
    return this.screen.text(region);
  }

  private paint(x: number, y: number, char: string, cell: Partial<Cell>): void {
    const c: Cell = { ...emptyCell(), ...cell, char };
    if (this.selection && x >= this.selection.x1 && x <= this.selection.x2 && y >= this.selection.y1 && y <= this.selection.y2) {
      c.inverse = true;
    }
    this.screen.set(x, y, c);
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

  private styleCell(node: VTNode, inheritedBg: string): Cell {
    const cell = emptyCell();
    const color = node.styles.get('color');
    if (typeof color === 'string' && color.length > 0) {
      cell.fg = color;
    }
    const bgColor = node.styles.get('backgroundColor');
    const bg =
      typeof bgColor === 'string' && bgColor.length > 0 ? bgColor : inheritedBg;
    cell.bg = bg;
    if (node.styles.get('fontWeight') === 'bold') cell.bold = true;
    if (node.styles.get('fontStyle') === 'italic') cell.italic = true;
    if (node.styles.get('textDecoration') === 'underline') cell.underline = true;
    if (node.styles.get('textDecoration') === 'strikethrough') cell.strikethrough = true;
    if (node.styles.get('opacity') === 'dim') cell.dim = true;
    if (node.styles.get('inverse') === 'true') cell.inverse = true;
    const url = node.styles.get('hyperlink');
    if (typeof url === 'string' && url.length > 0) {
      cell.hyperlink = url;
    }
    return cell;
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
    const cell = this.styleCell(node, inheritedBg);

    for (let i = 0; i < lines.length; i++) {
      if (clip && (y + i < clip.y || y + i >= clip.y + clip.height)) continue;
      let line = lines[i];
      if (stringWidth(line) > width) {
        line = truncateToWidth(line, width);
      }
      line = this.alignText(line, width, align);
      const clipped = this.clipLine(line, x, clip);
      if (clipped === null) continue;
      let col = 0;
      for (const ch of clipped) {
        this.paint(x + col, y + i, ch, cell);
        col += cellWidth(ch);
      }
    }
  }

  private renderBackground(node: LayoutNode, inheritedBg: string, clip: ClipRect | null): void {
    const { x, y, width, height } = node;
    const bgColor = node.vtNode.styles.get('backgroundColor');
    if (typeof bgColor !== 'string' || bgColor.length === 0) return;

    const radius = Number(node.vtNode.styles.get('borderRadius') ?? 0);
    const bgCell = { ...emptyCell(), bg: bgColor };

    // Visible row span within the clip viewport
    const rowStart = clip ? Math.max(0, clip.y - y) : 0;
    const rowEnd = clip ? Math.min(height, clip.y + clip.height - y) : height;
    if (rowEnd <= rowStart) return;

    const colStart = clip ? Math.max(0, clip.x - x) : 0;
    const colEnd = clip ? Math.min(width, clip.x + clip.width - x) : width;

    const fillRow = (row: number, from: number, to: number): void => {
      if (clip && (y + row < clip.y || y + row >= clip.y + clip.height)) return;
      for (let col = Math.max(from, colStart); col < Math.min(to, colEnd); col++) {
        this.paint(x + col, y + row, ' ', bgCell);
      }
    };

    if (radius <= 0 || height < 2 || width < 2) {
      for (let row = rowStart; row < rowEnd; row++) {
        fillRow(row, 0, width);
      }
      return;
    }

    // Rounded corners: paint the corner glyphs in the block's color.
    const cornerBg: Cell = { ...bgCell, fg: bgColor, bg: inheritedBg };
    const paintCorner = (col: number, row: number, glyph: string): void => {
      if (clip && (y + row < clip.y || y + row >= clip.y + clip.height)) return;
      if (clip && (x + col < clip.x || x + col >= clip.x + clip.width)) return;
      this.paint(x + col, y + row, glyph, cornerBg);
    };

    // Top row (skip corner cells, then place the rounded corners)
    if (rowStart <= 0 && 0 < rowEnd) {
      fillRow(0, 1, width - 1);
      paintCorner(0, 0, '\u256d');
      paintCorner(width - 1, 0, '\u256e');
    }
    // Interior rows
    for (let row = Math.max(1, rowStart); row < rowEnd && row < height - 1; row++) {
      fillRow(row, 0, width);
    }
    // Bottom row
    if (rowStart <= height - 1 && height - 1 < rowEnd) {
      fillRow(height - 1, 1, width - 1);
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
    const cell: Cell = { ...emptyCell(), bg: effectiveBg };
    if (typeof color === 'string' && color.length > 0) {
      cell.fg = color;
    }

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
        this.paint(x, y + row, bar[0]!, cell);
        if (bar.length > 1) this.paint(x + 1, y + row, bar[1]!, cell);
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
      this.paint(x, y, topLeft, cell);
    }
    if (rowVisible(0)) {
      let from = 1;
      let to = width - 1;
      if (clip) {
        from = Math.max(from, clip.x - x);
        to = Math.min(to, clip.x + clip.width - x);
      }
      for (let cx = from; cx < to; cx++) {
        this.paint(x + cx, y, borderChars.horizontal, cell);
      }
    }
    if (rowVisible(0) && colVisible(width - 1)) {
      this.paint(x + width - 1, y, topRight, cell);
    }

    // Sides
    for (let row = 1; row < height - 1; row++) {
      if (!rowVisible(row)) continue;
      if (colVisible(0)) {
        this.paint(x, y + row, borderChars.vertical, cell);
      }
      if (colVisible(width - 1)) {
        this.paint(x + width - 1, y + row, borderChars.vertical, cell);
      }
    }

    // Bottom
    const lastRow = height - 1;
    if (rowVisible(lastRow) && colVisible(0)) {
      this.paint(x, y + lastRow, bottomLeft, cell);
    }
    if (rowVisible(lastRow)) {
      let from = 1;
      let to = width - 1;
      if (clip) {
        from = Math.max(from, clip.x - x);
        to = Math.min(to, clip.x + clip.width - x);
      }
      for (let cx = from; cx < to; cx++) {
        this.paint(x + cx, y + lastRow, borderChars.horizontal, cell);
      }
    }
    if (rowVisible(lastRow) && colVisible(width - 1)) {
      this.paint(x + width - 1, y + lastRow, bottomRight, cell);
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

    const lines = textContent.split('\n');
    const wrapped: string[] = [];
    const wrap = vtNode.styles.get('wrap') === 'wrap';

    for (const line of lines) {
      if (wrap && width > 0 && stringWidth(line) > width) {
        const sub = wrapText(line, width);
        for (const l of sub) wrapped.push(l);
      } else {
        wrapped.push(line);
      }
    }

    const align = String(vtNode.styles.get('textAlign') ?? 'left');
    const cell = this.styleCell(vtNode, inheritedBg);
    for (let i = 0; i < wrapped.length && i < height; i++) {
      if (clip && (y + i < clip.y || y + i >= clip.y + clip.height)) continue;
      let line = wrapped[i];
      if (stringWidth(line) > width) line = truncateToWidth(line, width);
      line = this.alignText(line, width, align);
      const clipped = this.clipLine(line, x, clip);
      if (clipped === null) continue;
      let col = 0;
      for (const ch of clipped) {
        this.paint(x + col, y + i, ch, cell);
        col += cellWidth(ch);
      }
    }
  }

  private clipLine(line: string, x: number, clip: ClipRect | null): string | null {
    if (!clip) return line;
    if (x >= clip.x + clip.width) return null;
    if (x + stringWidth(line) <= clip.x) return null;
    let s = line;
    let start = x;
    if (start < clip.x) {
      s = dropCellsFromStart(s, clip.x - start);
      start = clip.x;
    }
    const max = clip.x + clip.width - start;
    if (stringWidth(s) > max) s = truncateToWidth(s, max);
    return s;
  }

  private alignText(
    text: string,
    width: number,
    align: string,
  ): string {
    const textWidth = stringWidth(text);
    if (textWidth >= width) return text;

    const pad = width - textWidth;
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
}