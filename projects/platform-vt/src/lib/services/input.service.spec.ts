import { describe, it, expect } from 'vitest';
import { splitInputKeys } from './input.service';

describe('splitInputKeys', () => {
  it('splits a multi-character chunk into individual keys', () => {
    expect(splitInputKeys('hello')).toEqual(['h', 'e', 'l', 'l', 'o']);
  });

  it('keeps a single character as one key', () => {
    expect(splitInputKeys('a')).toEqual(['a']);
  });

  it('returns an empty array for an empty chunk', () => {
    expect(splitInputKeys('')).toEqual([]);
  });

  it('preserves known escape sequences as single keys', () => {
    expect(splitInputKeys('\x1b[B')).toEqual(['\x1b[B']);
    expect(splitInputKeys('\x1b[3~')).toEqual(['\x1b[3~']);
  });

  it('preserves tab as a single key', () => {
    expect(splitInputKeys('\t')).toEqual(['\t']);
  });

  it('mixes escape sequences and literal characters', () => {
    expect(splitInputKeys('a\x1b[Bb')).toEqual(['a', '\x1b[B', 'b']);
  });

  it('splits an unknown escape sequence into its raw characters', () => {
    expect(splitInputKeys('x\x1bYz')).toEqual(['x', '\x1b', 'Y', 'z']);
  });

  it('matches kitty sequences only when kitty parsing is enabled', () => {
    expect(splitInputKeys('a\x1b[99;5u', false)).toEqual([
      'a',
      '\x1b',
      '[',
      '9',
      '9',
      ';',
      '5',
      'u',
    ]);
    expect(splitInputKeys('a\x1b[99;5u', true)).toEqual(['a', '\x1b[99;5u']);
  });

  it('matches all kitty sequence forms', () => {
    expect(splitInputKeys('\x1b[97u\x1b[1;2A\x1b[15;5~', true)).toEqual([
      '\x1b[97u',
      '\x1b[1;2A',
      '\x1b[15;5~',
    ]);
  });

  it('leaves legacy sequences untouched when kitty parsing is enabled', () => {
    expect(splitInputKeys('\x1b[B', true)).toEqual(['\x1b[B']);
    expect(splitInputKeys('\t', true)).toEqual(['\t']);
  });
});
