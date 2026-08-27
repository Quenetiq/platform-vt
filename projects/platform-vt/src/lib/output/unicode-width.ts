/**
 * Display-width helpers for terminal text.
 *
 * Terminals measure text in cells: combining marks, variation selectors and
 * zero-width joiner sequences take 0 cells, most Latin/Cyrillic text takes 1,
 * and CJK ideographs plus most emoji take 2. Using `String.length` (UTF-16
 * code units) for truncation, wrapping, alignment and padding silently breaks
 * layout for such characters.
 *
 * The tables below cover the most common ranges (Latin/Indic/Arabic/Hebrew
 * combining marks, variation selectors, ZWJ, Hangul, CJK, fullwidth forms and
 * the main emoji blocks). Less common historic scripts may measure slightly
 * differently, which is acceptable for a terminal renderer.
 */

const ZERO_WIDTH_RE =
  // Combining marks and modifiers (Latin, Cyrillic, Hebrew, Arabic, Indic...)
  /[\u0300-\u036f\u0483-\u0489\u0591-\u05bd\u05bf\u05c1-\u05c2\u05c4-\u05c5\u05c7\u0610-\u061a\u064b-\u065f\u0670\u06d6-\u06dc\u06df-\u06e4\u06e7-\u06e8\u06ea-\u06ed\u0711\u0730-\u074a\u07a6-\u07b0\u07eb-\u07f3\u0816-\u0819\u081b-\u0823\u0825-\u0827\u0829-\u082d\u0859-\u085b\u08d3-\u08e1\u08e3-\u0902\u093a\u093c\u0941-\u0948\u094d\u0951-\u0957\u0962-\u0963\u0981\u09bc\u09c1-\u09c4\u09cd\u09e2-\u09e3\u0a01-\u0a03\u0a3c\u0a41-\u0a42\u0a47-\u0a48\u0a4b-\u0a4d\u0a51\u0a70-\u0a71\u0a75\u0a81-\u0a83\u0abc\u0ac1-\u0ac5\u0ac7-\u0ac8\u0acd\u0ae2-\u0ae3\u0b01-\u0b03\u0b3c\u0b3f\u0b41-\u0b44\u0b4d\u0b56\u0b62-\u0b63\u0b82\u0bc0\u0bcd\u0c00\u0c04\u0c3e-\u0c40\u0c46-\u0c48\u0c4a-\u0c4d\u0c55-\u0c56\u0c62-\u0c63\u0c81-\u0c83\u0cbc\u0cbf\u0cc6\u0ccc-\u0ccd\u0ce2-\u0ce3\u0d00-\u0d03\u0d3b-\u0d3c\u0d41-\u0d44\u0d4d\u0d62-\u0d63\u0dca\u0dd2-\u0dd4\u0dd6\u0e31\u0e34-\u0e3a\u0e47-\u0e4e\u0eb1\u0eb4-\u0eb9\u0ebb-\u0ebc\u0ec8-\u0ecd\u0f18-\u0f19\u0f35\u0f37\u0f39\u0f71-\u0f7e\u0f80-\u0f84\u0f86-\u0f87\u0f8d-\u0f97\u0f99-\u0fbc\u0fc6\u102d-\u1030\u1032-\u1037\u1039-\u103a\u103d-\u103e\u1058-\u1059\u105e-\u1060\u1071-\u1074\u1082\u1085-\u1086\u108d\u109d\u135d-\u135f\u1712-\u1714\u1732-\u1734\u1752-\u1753\u1772-\u1773\u17b4-\u17b5\u17b7-\u17bd\u17c6\u17c9-\u17d3\u17dd\u180b-\u180d\u180f\u1885-\u1886\u18a9\u1920-\u1922\u1927-\u1928\u1932\u1939-\u193b\u1a17-\u1a18\u1a1b\u1a56\u1a58-\u1a5e\u1a60\u1a62\u1a65-\u1a6c\u1a73-\u1a7c\u1a7f\u1ab0-\u1ac0\u1b00-\u1b03\u1b34\u1b36-\u1b3a\u1b3c\u1b42\u1b6b-\u1b73\u1b80-\u1b81\u1ba2-\u1ba5\u1ba8-\u1ba9\u1bab-\u1bad\u1be6\u1be8-\u1be9\u1bed\u1bef-\u1bf1\u1c2c-\u1c33\u1c36-\u1c37\u1cd0-\u1cd2\u1cd4-\u1ce0\u1ce2-\u1ce8\u1ced\u1cf4\u1cf8-\u1cf9\u1dc0-\u1df9\u1dfb-\u1dff\u200b-\u200f\u202a-\u202e\u2060-\u2064\u2066-\u206f\u20d0-\u20f0\u2cef-\u2cf1\u2d7f\u2de0-\u2dff\u302a-\u302d\u3099-\u309a\u3164\ufe00-\ufe0f\ufe20-\ufe2f\ufeff\uff9e-\uff9f\ufff9-\ufffb\u{1f3fb}-\u{1f3ff}\u200d]/u;

const WIDE_RE =
  // Hangul, CJK, fullwidth forms and emoji that occupy two cells
  /[\u1100-\u115f\u2e80-\u303e\u3041-\u33ff\u3400-\u4dbf\u4e00-\u9fff\ua000-\ua4cf\ua960-\ua97f\uac00-\ud7a3\uf900-\ufaff\ufe30-\ufe4f\uff00-\uff60\uffe0-\uffe6\u{1b000}-\u{1b2ff}\u{1f004}\u{1f0cf}\u{1f18e}\u{1f191}-\u{1f19a}\u{1f200}-\u{1f202}\u{1f210}-\u{1f23b}\u{1f240}-\u{1f248}\u{1f250}-\u{1f251}\u{1f300}-\u{1f64f}\u{1f680}-\u{1f6ff}\u{1f900}-\u{1f9ff}\u{1fa70}-\u{1faff}\u{20000}-\u{2fffd}\u{30000}-\u{3fffd}]/u;

/** Whether a single character occupies 2 terminal cells. */
export function isWideChar(ch: string): boolean {
  return WIDE_RE.test(ch);
}

/** Whether a single character occupies 0 terminal cells (combining, ZWJ...). */
export function isZeroWidthChar(ch: string): boolean {
  return ZERO_WIDTH_RE.test(ch);
}

/**
 * The display width of a single character in terminal cells: 0, 1 or 2.
 *
 * @param ch - A single character (code point). Longer strings return 1.
 */
export function cellWidth(ch: string): number {
  if (ch.length === 0) return 0;
  if (isZeroWidthChar(ch)) return 0;
  if (isWideChar(ch)) return 2;
  return 1;
}

/**
 * Total display width of a string in terminal cells.
 *
 * @param str - The string to measure.
 * @example
 * ```typescript
 * stringWidth('Привет');      // 6
 * stringWidth('Привет 世界'); // 10
 * stringWidth('a\u0301');     // 1 (combining accent)
 * ```
 */
export function stringWidth(str: string): number {
  let width = 0;
  for (const ch of str) {
    width += cellWidth(ch);
  }
  return width;
}

/**
 * Truncate a string so its display width fits within `width` cells.
 *
 * Never splits a surrogate pair or a wide character: a 2-cell char that does
 * not fit is dropped entirely.
 *
 * @param str - The string to truncate.
 * @param width - Maximum display width in cells.
 * @returns The truncated string.
 */
export function truncateToWidth(str: string, width: number): string {
  if (width <= 0) return '';
  let current = 0;
  let result = '';
  for (const ch of str) {
    const w = cellWidth(ch);
    if (current + w > width) break;
    result += ch;
    current += w;
  }
  return result;
}

/**
 * Pad a string with trailing spaces up to `width` cells.
 *
 * Wide characters are accounted for, so the result always occupies exactly
 * `Math.max(stringWidth(str), width)` cells.
 *
 * @param str - The string to pad.
 * @param width - Target display width in cells.
 * @returns The padded string.
 */
export function padToWidth(str: string, width: number): string {
  const missing = width - stringWidth(str);
  return missing > 0 ? str + ' '.repeat(missing) : str;
}

/**
 * Truncate a string from the start so its display width fits `width` cells.
 *
 * Useful for the right end of a long line (e.g. a breadcrumb).
 */
export function truncateFromStart(str: string, width: number): string {
  if (width <= 0) return '';
  const chars = Array.from(str);
  let current = 0;
  let result = '';
  for (let i = chars.length - 1; i >= 0; i--) {
    const ch = chars[i]!;
    const w = cellWidth(ch);
    if (current + w > width) break;
    result = ch + result;
    current += w;
  }
  return result;
}

/**
 * Drop the first `cells` display cells from the start of a string.
 *
 * A wide character that would be partially dropped is dropped entirely.
 *
 * @param str - The string to trim.
 * @param cells - Number of leading cells to remove.
 * @returns The string without its leading `cells` cells.
 */
export function dropCellsFromStart(str: string, cells: number): string {
  if (cells <= 0) return str;
  let remaining = cells;
  for (let i = 0; i < str.length; i++) {
    const w = cellWidth(str[i]!);
    if (remaining <= 0) return str.substring(i);
    if (remaining < w) return str.substring(i + 1);
    remaining -= w;
  }
  return '';
}