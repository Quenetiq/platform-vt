import { describe, it, expect } from 'vitest';
import {
  stringWidth,
  cellWidth,
  truncateToWidth,
  truncateFromStart,
  padToWidth,
  dropCellsFromStart,
} from './unicode-width';

describe('stringWidth / cellWidth', () => {
  it('measures ASCII text as 1 cell per char', () => {
    expect(stringWidth('tooltip')).toBe(7);
    expect(stringWidth('Hello, world!')).toBe(13);
  });

  it('measures CJK ideographs as 2 cells', () => {
    expect(cellWidth('世')).toBe(2);
    expect(stringWidth('世界')).toBe(4);
    expect(stringWidth('Привет 世界')).toBe(11);
  });

  it('measures emoji as 2 cells', () => {
    expect(cellWidth('😀')).toBe(2);
    expect(stringWidth('a😀b')).toBe(4);
  });

  it('treats combining marks and ZWJ as zero width', () => {
    expect(stringWidth('a\u0301')).toBe(1); // á as a + combining accent
    expect(stringWidth('👨\u200d👩\u200d👧')).toBe(6); // family emoji = 3 wide emoji
    expect(cellWidth('\u0301')).toBe(0);
  });

  it('does not match plain ASCII against wide/zero ranges', () => {
    for (const ch of 'abcdefghijklmnopqrstuvwxyz0123456789'.split('')) {
      expect(cellWidth(ch)).toBe(1);
    }
  });
});

describe('truncateToWidth', () => {
  it('truncates ASCII at the width boundary', () => {
    expect(truncateToWidth('tooltip', 4)).toBe('tool');
    expect(truncateToWidth('tooltip', 0)).toBe('');
  });

  it('never splits a wide character', () => {
    expect(truncateToWidth('世界界', 3)).toBe('世'); // 世=2, 界 would overflow
    expect(truncateToWidth('a世界', 4)).toBe('a世');
  });

  it('drops combining marks that would overflow', () => {
    // 'a\u0301' is exactly 1 cell; the next 'b' fits within 2 cells.
    expect(truncateToWidth('a\u0301b', 2)).toBe('a\u0301b');
    // A combining mark is zero-width, so it never triggers truncation and
    // stays glued to its base letter.
    expect(truncateToWidth('a\u0301', 1)).toBe('a\u0301');
  });
});

describe('truncateFromStart / dropCellsFromStart', () => {
  it('truncates from the start keeping the tail', () => {
    expect(truncateFromStart('tooltip', 3)).toBe('tip');
  });

  it('drops whole wide chars only', () => {
    expect(dropCellsFromStart('a世界', 3)).toBe('界');
    expect(dropCellsFromStart('ab界', 2)).toBe('界');
    expect(dropCellsFromStart('ab', 5)).toBe('');
  });
});

describe('padToWidth', () => {
  it('pads to the target width accounting for wide chars', () => {
    expect(padToWidth('a', 4)).toBe('a   ');
    expect(padToWidth('世界', 5)).toBe('世界 ');
  });
});