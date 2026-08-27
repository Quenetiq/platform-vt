import { describe, it, expect } from 'vitest';
import { sixelEncode, sixelWrite, parsePpmP6 } from './sixel';

describe('sixelEncode', () => {
  it('produces a DCS sequence with register definitions', () => {
    // 2x2 image: red, green / blue, white
    const rgb = new Uint8Array([
      255, 0, 0, 0, 255, 0,
      0, 0, 255, 255, 255, 255,
    ]);
    const out = sixelWrite(2, 2, rgb);
    expect(out.startsWith('\x1bPq')).toBe(true);
    expect(out.endsWith('\x1b\\')).toBe(true);
    // Register definitions for the quantized colors, in column-major scan
    // order: red (col 0, row 0), blue (col 0, row 1), green (col 1, row 0)…
    expect(out).toContain('#0;2;255;0;0');
    expect(out).toContain('#1;2;0;0;255');
    expect(out).toContain('#2;2;0;255;0');
    // Band separator between the single band pair (2 rows -> 1 band).
    expect(out).not.toContain('-');
  });

  it('encodes multi-band images with a band separator', () => {
    const width = 1;
    const height = 7; // 2 bands
    const rgb = new Uint8Array(width * height * 3).fill(255);
    const out = sixelEncode(width, height, rgb);
    expect(out).toContain('-');
  });

  it('run-length compresses identical columns', () => {
    const width = 3;
    const height = 1;
    const rgb = new Uint8Array(width * height * 3).fill(85);
    const out = sixelEncode(width, height, rgb);
    // Three identical single-bit masks compress to !3 + char.
    expect(out).toContain('!3');
  });

  it('returns empty for zero dimensions', () => {
    expect(sixelEncode(0, 5, new Uint8Array(0))).toBe('');
    expect(sixelEncode(5, 0, new Uint8Array(0))).toBe('');
  });
});

describe('parsePpmP6', () => {
  function ppm(width: number, height: number, pixels: number[]): Buffer {
    const header = Buffer.from(`P6\n${width} ${height}\n255\n`, 'ascii');
    return Buffer.concat([header, Buffer.from(pixels)]);
  }

  it('parses a simple P6 header and pixels', () => {
    const file = ppm(2, 1, [255, 0, 0, 0, 255, 0]);
    const { width, height, rgb } = parsePpmP6(file);
    expect(width).toBe(2);
    expect(height).toBe(1);
    expect(Array.from(rgb)).toEqual([255, 0, 0, 0, 255, 0]);
  });

  it('rejects non-PPM data', () => {
    expect(() => parsePpmP6(Buffer.from('not an image'))).toThrow(/PPM/);
  });

  it('rejects truncated pixel data', () => {
    const file = ppm(4, 4, [0, 0, 0]);
    expect(() => parsePpmP6(file)).toThrow(/Truncated/);
  });
});