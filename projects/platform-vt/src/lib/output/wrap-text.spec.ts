import { describe, it, expect } from 'vitest';
import { wrapText } from './wrap-text';

describe('wrapText', () => {
  it('returns the text unchanged when it fits the width', () => {
    expect(wrapText('hello world', 50)).toEqual(['hello world']);
  });

  it('wraps on word boundaries', () => {
    expect(wrapText('hello world foo', 8)).toEqual(['hello ', 'world ', 'foo']);
  });

  it('keeps a single word longer than the width on its own line', () => {
    expect(wrapText('supercalifragilistic', 5)).toEqual(['supercalifragilistic']);
  });

  it('returns no lines for a zero or negative width', () => {
    expect(wrapText('hello', 0)).toEqual([]);
    expect(wrapText('hello', -3)).toEqual([]);
  });

  it('returns an empty line for empty text', () => {
    expect(wrapText('', 10)).toEqual(['']);
  });

  it('drops whitespace-only gaps between wrapped lines', () => {
    expect(wrapText('a  b', 2)).toEqual(['a', 'b']);
  });

  it('counts exactly one line per rendered row', () => {
    const lines = wrapText('The quick brown fox jumps over the lazy dog', 10);
    expect(lines.length).toBe(5);
  });
});
