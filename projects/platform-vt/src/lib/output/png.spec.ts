import { describe, it, expect, vi, afterEach } from 'vitest';
import { deflateSync } from 'node:zlib';
import { decodePng } from './png';

/**
 * Build a minimal PNG: 8-bit RGB(A), non-interlaced, single IDAT.
 * Scanlines use the "None" filter.
 */
function buildPng(width: number, height: number, rgb: number[], colorType: number): Uint8Array {
  const channels = colorType === 2 ? 3 : 4;
  const stride = width * channels;
  const raw = new Uint8Array((stride + 1) * height);
  let offset = 0;
  for (let y = 0; y < height; y++) {
    raw[offset] = 0; // filter: None
    offset++;
    for (let x = 0; x < stride; x++) {
      raw[offset + x] = rgb[y * stride + x] ?? 0;
    }
    offset += stride;
  }
  const idat = deflateSync(raw);

  const header = new Uint8Array(13);
  writeU32(header, 0, width);
  writeU32(header, 4, height);
  header[8] = 8; // bit depth
  header[9] = colorType;
  header[12] = 0; // no interlace

  const chunks: Uint8Array[] = [];
  chunks.push(chunk('IHDR', header));
  chunks.push(chunk('IDAT', idat));
  chunks.push(chunk('IEND', new Uint8Array(0)));

  const signature = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const out = new Uint8Array(signature.length + total);
  out.set(signature, 0);
  let offset2 = signature.length;
  for (const c of chunks) {
    out.set(c, offset2);
    offset2 += c.length;
  }
  return out;
}

function chunk(type: string, data: Uint8Array): Uint8Array {
  const typeBytes = new TextEncoder().encode(type);
  const out = new Uint8Array(12 + data.length);
  writeU32(out, 0, data.length);
  out.set(typeBytes, 4);
  out.set(data, 8);
  // CRC is omitted; the decoder does not verify it.
  return out;
}

function writeU32(bytes: Uint8Array, offset: number, value: number): void {
  bytes[offset] = (value >>> 24) & 0xff;
  bytes[offset + 1] = (value >>> 16) & 0xff;
  bytes[offset + 2] = (value >>> 8) & 0xff;
  bytes[offset + 3] = value & 0xff;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('decodePng', () => {
  it('decodes an RGB png', () => {
    // 2x2: red, green / blue, white
    const png = buildPng(2, 2, [255, 0, 0, 0, 255, 0, 0, 0, 255, 255, 255, 255], 2);
    const decoded = decodePng(png);
    expect(decoded).not.toBeNull();
    expect(decoded!.width).toBe(2);
    expect(decoded!.height).toBe(2);
    expect(Array.from(decoded!.rgb)).toEqual([255, 0, 0, 0, 255, 0, 0, 0, 255, 255, 255, 255]);
  });

  it('drops the alpha channel from RGBA pngs', () => {
    const png = buildPng(1, 1, [10, 20, 30, 255], 6);
    const decoded = decodePng(png);
    expect(decoded).not.toBeNull();
    expect(Array.from(decoded!.rgb)).toEqual([10, 20, 30]);
  });

  it('rejects non-PNG input', () => {
    expect(decodePng(new Uint8Array([1, 2, 3]))).toBeNull();
    expect(decodePng(new TextEncoder().encode('not a png at all!'))).toBeNull();
  });

  it('returns null when zlib is unavailable', () => {
    vi.spyOn(process, 'getBuiltinModule').mockReturnValue(undefined as never);
    const png = buildPng(1, 1, [1, 2, 3], 2);
    expect(decodePng(png)).toBeNull();
  });
});
