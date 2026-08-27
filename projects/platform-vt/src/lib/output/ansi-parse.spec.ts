import { describe, it, expect } from 'vitest';
import { parseAnsi } from './ansi-parse';

describe('parseAnsi', () => {
  it('returns a single plain segment for text without codes', () => {
    expect(parseAnsi('plain text')).toEqual([{ text: 'plain text' }]);
  });

  it('parses the 16 basic colors', () => {
    const segments = parseAnsi('\x1b[31mred\x1b[32mgreen\x1b[0mplain');
    expect(segments).toEqual([
      { text: 'red', color: 'red' },
      { text: 'green', color: 'green' },
      { text: 'plain' },
    ]);
  });

  it('parses bright colors', () => {
    const segments = parseAnsi('\x1b[91mhi\x1b[0m');
    expect(segments).toEqual([{ text: 'hi', color: 'bright-red' }]);
  });

  it('parses background colors', () => {
    const segments = parseAnsi('\x1b[44mon blue\x1b[0m');
    expect(segments).toEqual([{ text: 'on blue', backgroundColor: 'blue' }]);
  });

  it('parses 256-color sequences as 256:<index>', () => {
    const segments = parseAnsi('\x1b[38;5;214morange-ish\x1b[0m');
    expect(segments).toEqual([{ text: 'orange-ish', color: '256:214' }]);
  });

  it('parses truecolor sequences as #rrggbb', () => {
    const segments = parseAnsi('\x1b[38;2;255;136;0mhi\x1b[0m');
    expect(segments).toEqual([{ text: 'hi', color: '#ff8800' }]);
  });

  it('parses text styles', () => {
    const segments = parseAnsi('\x1b[1mbold\x1b[3m italic\x1b[0m');
    expect(segments).toEqual([
      { text: 'bold', bold: true },
      { text: ' italic', bold: true, italic: true },
    ]);
  });

  it('merges consecutive runs with identical styles', () => {
    const segments = parseAnsi('\x1b[31ma\x1b[31mb\x1b[0mc');
    expect(segments).toEqual([
      { text: 'ab', color: 'red' },
      { text: 'c' },
    ]);
  });

  it('resets color with 39 and keeps other styles', () => {
    const segments = parseAnsi('\x1b[1m\x1b[31mred-bold\x1b[39mplain-bold\x1b[0m');
    expect(segments).toEqual([
      { text: 'red-bold', color: 'red', bold: true },
      { text: 'plain-bold', bold: true },
    ]);
  });

  it('drops non-SGR escape sequences from the output', () => {
    const segments = parseAnsi('a\x1b[2Jb');
    expect(segments).toEqual([{ text: 'ab' }]);
  });
});