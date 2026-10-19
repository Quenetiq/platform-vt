import { describe, it, expect } from 'vitest';
import {
  countGraphemes,
  indexAtCellColumn,
  nextGraphemeIndex,
  prevGraphemeIndex,
} from './graphemes';

describe('grapheme helpers', () => {
  it('steps over surrogate pairs', () => {
    const text = 'a😀b';
    expect(nextGraphemeIndex(text, 0)).toBe(1);
    expect(nextGraphemeIndex(text, 1)).toBe(3);
    expect(nextGraphemeIndex(text, 3)).toBe(4);
    expect(prevGraphemeIndex(text, 4)).toBe(3);
    expect(prevGraphemeIndex(text, 3)).toBe(1);
    expect(prevGraphemeIndex(text, 1)).toBe(0);
  });

  it('counts emoji sequences as one grapheme', () => {
    expect(countGraphemes('a😀b')).toBe(3);
    expect(countGraphemes('👨‍👩‍👧')).toBe(1);
    expect(countGraphemes('e\u0301')).toBe(1);
  });

  it('maps cell columns to grapheme indices', () => {
    const text = '世界a';
    expect(indexAtCellColumn(text, 0)).toBe(0);
    expect(indexAtCellColumn(text, 1)).toBe(0);
    expect(indexAtCellColumn(text, 2)).toBe(1);
    expect(indexAtCellColumn(text, 4)).toBe(2);
    expect(indexAtCellColumn(text, 5)).toBe(3);
  });
});
