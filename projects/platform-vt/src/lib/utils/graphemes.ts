import { cellWidth } from '../output/unicode-width';

/**
 * Grapheme-cluster helpers.
 *
 * JavaScript string indices address UTF-16 code units, which splits emoji
 * (surrogate pairs) and combined sequences (flags, skin tones, ZWJ emoji,
 * combining marks). Editing operations use grapheme boundaries instead, so
 * Backspace/Delete/arrows never create invalid half-characters.
 */

type Segmenter = {
  segment(text: string): Iterable<{ segment: string; index: number }>;
};

let cachedSegmenter: Segmenter | null | undefined;

function segmenter(): Segmenter | null {
  if (cachedSegmenter !== undefined) return cachedSegmenter;
  try {
    const intl = Intl as unknown as {
      Segmenter?: new (
        locale?: string,
        options?: { granularity: 'grapheme' },
      ) => Segmenter;
    };
    cachedSegmenter = intl.Segmenter
      ? new intl.Segmenter(undefined, { granularity: 'grapheme' })
      : null;
  } catch {
    cachedSegmenter = null;
  }
  return cachedSegmenter;
}

/** Index of the next grapheme boundary after `index`. */
export function nextGraphemeIndex(text: string, index: number): number {
  if (index >= text.length) return text.length;
  const seg = segmenter();
  if (seg) {
    for (const part of seg.segment(text)) {
      if (part.index > index) return part.index;
    }
    return text.length;
  }
  const code = text.codePointAt(index) ?? 0;
  return Math.min(text.length, index + (code > 0xffff ? 2 : 1));
}

/** Index of the previous grapheme boundary before `index`. */
export function prevGraphemeIndex(text: string, index: number): number {
  if (index <= 0) return 0;
  const seg = segmenter();
  if (seg) {
    let previous = 0;
    for (const part of seg.segment(text)) {
      if (part.index >= index) break;
      previous = part.index;
    }
    return previous;
  }
  const low = text.charCodeAt(index - 1);
  if (low >= 0xdc00 && low <= 0xdfff && index >= 2) {
    const high = text.charCodeAt(index - 2);
    if (high >= 0xd800 && high <= 0xdbff) return index - 2;
  }
  return index - 1;
}

/** Number of grapheme clusters in a string. */
export function countGraphemes(text: string): number {
  const seg = segmenter();
  if (!seg) return Array.from(text).length;
  let count = 0;
  for (const part of seg.segment(text)) {
    void part;
    count++;
  }
  return count;
}

/**
 * Convert a cell column (0-based, terminal columns) into a string index,
 * taking double-width CJK/emoji cells into account.
 */
export function indexAtCellColumn(text: string, column: number): number {
  if (column <= 0) return 0;
  let cells = 0;
  const seg = segmenter();
  if (seg) {
    for (const part of seg.segment(text)) {
      const width = cellWidth(part.segment);
      if (cells + width > column) return part.index;
      cells += width;
    }
    return text.length;
  }
  for (let i = 0; i < text.length; ) {
    const next = nextGraphemeIndex(text, i);
    const width = cellWidth(text.substring(i, next));
    if (cells + width > column) return i;
    cells += width;
    i = next;
  }
  return text.length;
}
