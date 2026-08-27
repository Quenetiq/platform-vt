import { cursor, erase, reset, osc } from './ansi';
import { resolveColorAdaptive, type ColorMode } from './color-map';
import { isWideChar } from './unicode-width';

/**
 * A single terminal cell.
 *
 * `fg`/`bg` hold color names (`'red'`, `'#ff8800'`, `'256:42'`) or `''` for
 * the terminal default. `bg: ''` additionally means *transparent* when a
 * layer paints over another: the existing background stays.
 */
export interface Cell {
  /** Display character. `'\uFFFF'` marks the second half of a wide char. */
  char: string;
  /** Foreground color name/`#hex`/`256:<n>`, or '' for default. */
  fg: string;
  /** Background color name/`#hex`/`256:<n>`, or '' for default/transparent. */
  bg: string;
  bold: boolean;
  dim: boolean;
  italic: boolean;
  underline: boolean;
  strikethrough: boolean;
  inverse: boolean;
  /** OSC 8 hyperlink target, or ''. */
  hyperlink: string;
}

/** Sentinel marking the continuation cell of a wide (CJK/emoji) character. */
export const WIDE_CONTINUATION = '\uFFFF';

/** Create an empty cell (space, default colors, no styles). */
export function emptyCell(): Cell {
  return {
    char: ' ',
    fg: '',
    bg: '',
    bold: false,
    dim: false,
    italic: false,
    underline: false,
    strikethrough: false,
    inverse: false,
    hyperlink: '',
  };
}

/** Whether two cells are visually identical (including hyperlink target). */
export function cellsEqual(a: Cell, b: Cell): boolean {
  return (
    a.char === b.char &&
    a.fg === b.fg &&
    a.bg === b.bg &&
    a.bold === b.bold &&
    a.dim === b.dim &&
    a.italic === b.italic &&
    a.underline === b.underline &&
    a.strikethrough === b.strikethrough &&
    a.inverse === b.inverse &&
    a.hyperlink === b.hyperlink
  );
}

/** A rectangular region of the screen (inclusive). */
export interface CellRegion {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/**
 * A virtual screen of terminal cells with frame-diffing.
 *
 * Every render pass repaints the whole virtual screen cell by cell; `paint()`
 * compares the new frame against the previous one and emits ANSI escapes
 * only for the cells that changed, grouped into same-style segments. On the
 * first frame (or after a resize) the whole screen is cleared and repainted.
 *
 * Layers paint into the same buffer: `bg: ''` keeps the background of the
 * cell below (transparency), and any other attribute overwrites it.
 */
export class ScreenBuffer {
  private width = 0;
  private height = 0;
  private cells: Cell[] = [];
  private prev: Cell[] | null = null;

  /** Reset the buffer for a new frame; full redraw on resize. */
  begin(width: number, height: number): void {
    if (width !== this.width || height !== this.height || this.cells.length === 0) {
      this.width = width;
      this.height = height;
      this.cells = Array.from({ length: width * height }, emptyCell);
      this.prev = null;
      return;
    }
    for (let i = 0; i < this.cells.length; i++) {
      this.cells[i] = emptyCell();
    }
  }

  /**
   * Paint a cell. Coordinates outside the screen are ignored.
   *
   * `bg: ''` keeps the existing background (transparent layers); every other
   * field overwrites. Wide characters occupy two cells; the second is marked
   * with {@link WIDE_CONTINUATION}. Replacing a wide character clears its
   * leftover second half.
   */
  set(x: number, y: number, cell: Cell): void {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return;
    const index = y * this.width + x;

    if (cell.bg === '' && this.cells[index]!.bg !== '') {
      cell = { ...cell, bg: this.cells[index]!.bg };
    }

    if (cell.char !== WIDE_CONTINUATION && cell.char !== '' && isWideChar(cell.char)) {
      // The old cell at x+1 may hold a leftover continuation; the wide char
      // overwrites it anyway.
      this.cells[index] = { ...cell };
      if (x + 1 < this.width) {
        const continuation = emptyCell();
        continuation.char = WIDE_CONTINUATION;
        this.cells[index + 1] = continuation;
      }
      return;
    }

    this.cells[index] = { ...cell };

    // Clear a leftover continuation half if we just overwrote part of a wide
    // character with a normal-width cell.
    if (x + 1 < this.width && this.cells[index + 1]!.char === WIDE_CONTINUATION) {
      this.cells[index + 1] = emptyCell();
    }
  }

  /**
   * Diff the current frame against the previous one and emit ANSI escapes
   * for the changed cells only.
   *
   * @param colorMode - Terminal color capability for SGR emission.
   * @returns The ANSI string for this frame.
   */
  paint(colorMode: ColorMode): string {
    const out: string[] = [];
    const prev = this.prev;
    this.prev = this.cells.slice();

    if (!prev) {
      out.push(cursor.hide());
      out.push(erase.screen());
      out.push(cursor.moveTo(0, 0));
    } else {
      out.push(cursor.hide());
    }

    let lastStyle: Cell = emptyCell();

    for (let y = 0; y < this.height; y++) {
      let x = 0;
      while (x < this.width) {
        const index = y * this.width + x;
        const cell = this.cells[index]!;

        if (cell.char === WIDE_CONTINUATION) {
          x++;
          continue;
        }

        const changed = !prev || !cellsEqual(cell, prev[index]!);
        if (!changed) {
          x++;
          continue;
        }

        // Extend the segment while following cells change with the same style.
        let end = x + 1;
        while (end < this.width) {
          const next = this.cells[y * this.width + end]!;
          if (next.char === WIDE_CONTINUATION) {
            end++;
            continue;
          }
          if (!prev || !cellsEqual(next, prev[y * this.width + end]!)) {
            if (!sameStyle(cell, next)) break;
            end++;
            continue;
          }
          break;
        }

        out.push(cursor.moveTo(x, y));
        lastStyle = emitSgr(out, cell, lastStyle, colorMode);

        let text = '';
        for (let cx = x; cx < end; cx++) {
          const c = this.cells[y * this.width + cx]!;
          if (c.char === WIDE_CONTINUATION) continue;
          text += c.char;
        }
        out.push(cell.hyperlink.length > 0 ? osc.hyperlink(cell.hyperlink, text) : text);

        x = end;
      }
    }

    out.push(reset());
    out.push(cursor.show());
    return out.join('');
  }

  /** Extract the text of a region (for selection/copy). */
  text(region: CellRegion): string {
    const lines: string[] = [];
    for (let y = region.y1; y <= region.y2 && y < this.height; y++) {
      if (y < 0) continue;
      let line = '';
      for (let x = region.x1; x <= region.x2 && x < this.width; x++) {
        if (x < 0) continue;
        const cell = this.cells[y * this.width + x]!;
        if (cell.char === WIDE_CONTINUATION) continue;
        line += cell.char;
      }
      lines.push(line.replace(/\s+$/, ''));
    }
    return lines.join('\n');
  }
}

/** Whether two cells share every style field (fg, bg, decorations, link). */
function sameStyle(a: Cell, b: Cell): boolean {
  return (
    a.fg === b.fg &&
    a.bg === b.bg &&
    a.bold === b.bold &&
    a.dim === b.dim &&
    a.italic === b.italic &&
    a.underline === b.underline &&
    a.strikethrough === b.strikethrough &&
    a.inverse === b.inverse &&
    a.hyperlink === b.hyperlink
  );
}

/** Emit only the SGR codes that differ between `prev` and `style`. */
function emitSgr(out: string[], style: Cell, prev: Cell, colorMode: ColorMode): Cell {
  if (style.fg !== prev.fg) {
    if (style.fg.length > 0) {
      const code = resolveColorAdaptive(style.fg, 'fg', colorMode);
      if (code) out.push(code);
    } else {
      out.push('\x1b[39m');
    }
  }
  if (style.bg !== prev.bg) {
    if (style.bg.length > 0) {
      const code = resolveColorAdaptive(style.bg, 'bg', colorMode);
      if (code) out.push(code);
    } else {
      out.push('\x1b[49m');
    }
  }
  if (style.bold !== prev.bold) out.push(style.bold ? '\x1b[1m' : '\x1b[22m');
  if (style.dim !== prev.dim) out.push(style.dim ? '\x1b[2m' : '\x1b[22m');
  if (style.italic !== prev.italic) out.push(style.italic ? '\x1b[3m' : '\x1b[23m');
  if (style.underline !== prev.underline) out.push(style.underline ? '\x1b[4m' : '\x1b[24m');
  if (style.strikethrough !== prev.strikethrough) {
    out.push(style.strikethrough ? '\x1b[9m' : '\x1b[29m');
  }
  if (style.inverse !== prev.inverse) out.push(style.inverse ? '\x1b[7m' : '\x1b[27m');
  return style;
}