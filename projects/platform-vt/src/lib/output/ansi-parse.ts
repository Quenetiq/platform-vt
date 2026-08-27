/**
 * Parses ANSI escape sequences (SGR colors/styles) into styled segments.
 *
 * Lets the library render text that already contains ANSI color codes (e.g.
 * tool/CLI output captured from another process) with its colors preserved.
 * Supported: the 16 basic colors, 256-color (`38;5;n`), truecolor
 * (`38;2;r;g;b`), bold, dim, italic, underline, strikethrough, and reset.
 *
 * The returned `color` / `backgroundColor` values are passed straight to the
 * color resolver, so `256:<n>` and `#rrggbb` forms resolve through
 * {@link resolveColorAdaptive} for the terminal's capabilities.
 */

export interface AnsiSegment {
  /** Plain text content of this segment. */
  text: string;
  /** Foreground color name/`#hex`/`256:<n>`, or undefined for default. */
  color?: string;
  /** Background color name/`#hex`/`256:<n>`, or undefined for default. */
  backgroundColor?: string;
  bold?: boolean;
  dim?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
}

const NAMED: Record<number, string> = {
  30: 'black',
  31: 'red',
  32: 'green',
  33: 'yellow',
  34: 'blue',
  35: 'magenta',
  36: 'cyan',
  37: 'white',
  90: 'gray',
  91: 'bright-red',
  92: 'bright-green',
  93: 'bright-yellow',
  94: 'bright-blue',
  95: 'bright-magenta',
  96: 'bright-cyan',
  97: 'bright-white',
};

const NAMED_BG: Record<number, string> = {
  40: 'black',
  41: 'red',
  42: 'green',
  43: 'yellow',
  44: 'blue',
  45: 'magenta',
  46: 'cyan',
  47: 'white',
  100: 'gray',
  101: 'bright-red',
  102: 'bright-green',
  103: 'bright-yellow',
  104: 'bright-blue',
  105: 'bright-magenta',
  106: 'bright-cyan',
  107: 'bright-white',
};

interface SgrState {
  color?: string;
  backgroundColor?: string;
  bold?: boolean;
  dim?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
}

/**
 * Parse a string containing SGR escape sequences into styled segments.
 *
 * Consecutive text runs with identical styles are merged into one segment.
 * Sequences that only select the default colors reset that attribute.
 *
 * @param text - Text possibly containing `\x1b[...m` sequences.
 * @returns The parsed segments (no ANSI codes inside).
 *
 * @example
 * ```typescript
 * parseAnsi('\x1b[31mred\x1b[1m bold red\x1b[0m plain');
 * // [{ text: 'red', color: 'red' }, { text: ' bold red', color: 'red', bold: true }, { text: ' plain' }]
 * ```
 */
export function parseAnsi(text: string): AnsiSegment[] {
  const segments: AnsiSegment[] = [];
  let state: SgrState = {};
  let plain = '';
  let index = 0;

  const flush = (): void => {
    if (plain.length === 0) return;
    const segment: AnsiSegment = { text: plain, ...state };
    const last = segments[segments.length - 1];
    if (last && sameStyle(last, segment)) {
      last.text += plain;
    } else {
      segments.push(segment);
    }
    plain = '';
  };

  while (index < text.length) {
    const ch = text[index];
    if (ch === '\x1b' && text[index + 1] === '[') {
      // CSI sequence: find the terminating byte (letter or ~).
      let end = index + 2;
      while (end < text.length && !/[A-Za-z~]/.test(text[end] ?? '')) end++;
      if (end >= text.length) {
        plain += text.substring(index);
        break;
      }
      const terminator = text[end]!;
      const codes = text.substring(index + 2, end);
      flush();
      if (terminator === 'm') {
        state = applySgr(state, codes);
      }
      index = end + 1;
      continue;
    }
    plain += ch;
    index++;
  }
  flush();

  return segments;
}

/** Whether two segments carry identical style state (for merging). */
function sameStyle(a: AnsiSegment, b: AnsiSegment): boolean {
  return (
    a.color === b.color &&
    a.backgroundColor === b.backgroundColor &&
    a.bold === b.bold &&
    a.dim === b.dim &&
    a.italic === b.italic &&
    a.underline === b.underline &&
    a.strikethrough === b.strikethrough
  );
}

/** Apply a `;`-separated SGR parameter list to the current style state. */
function applySgr(state: SgrState, codes: string): SgrState {
  const next: SgrState = { ...state };
  const params = codes.length === 0 ? [0] : codes.split(';').map(Number);

  for (let i = 0; i < params.length; i++) {
    const p = params[i]!;
    switch (p) {
      case 0:
        return {};
      case 1:
        next.bold = true;
        delete next.dim;
        break;
      case 2:
        next.dim = true;
        delete next.bold;
        break;
      case 3:
        next.italic = true;
        break;
      case 4:
        next.underline = true;
        break;
      case 9:
        next.strikethrough = true;
        break;
      case 22:
        delete next.bold;
        delete next.dim;
        break;
      case 23:
        delete next.italic;
        break;
      case 24:
        delete next.underline;
        break;
      case 29:
        delete next.strikethrough;
        break;
      case 39:
        next.color = undefined;
        break;
      case 49:
        next.backgroundColor = undefined;
        break;
      default:
        if (NAMED[p] !== undefined) next.color = NAMED[p];
        else if (NAMED_BG[p] !== undefined) next.backgroundColor = NAMED_BG[p];
        else if (p === 38 || p === 48) {
          const parsed = parseExtendedColor(params, i);
          if (parsed) {
            if (p === 38) next.color = parsed.value;
            else next.backgroundColor = parsed.value;
            i = parsed.lastIndex;
          }
        }
        break;
    }
  }
  return next;
}

/**
 * Parse `38;5;n` / `38;2;r;g;b` (or 48... for background) color sequences.
 */
function parseExtendedColor(
  params: number[],
  start: number,
): { value: string; lastIndex: number } | null {
  const mode = params[start + 1];
  if (mode === 5) {
    const index = params[start + 2];
    if (index === undefined) return null;
    return { value: `256:${String(index)}`, lastIndex: start + 2 };
  }
  if (mode === 2) {
    const r = params[start + 2];
    const g = params[start + 3];
    const b = params[start + 4];
    if (r === undefined || g === undefined || b === undefined) return null;
    const hex = [r, g, b]
      .map((v) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0'))
      .join('');
    return { value: `#${hex}`, lastIndex: start + 4 };
  }
  return null;
}