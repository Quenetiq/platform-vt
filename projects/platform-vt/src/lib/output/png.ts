/**
 * Minimal PNG decoder for sixel/kitty image emission.
 *
 * Supports the common PNG flavors: color types 0 (grayscale), 2 (RGB),
 * 4 (grayscale + alpha) and 6 (RGBA) at 8-bit depth, non-interlaced. The
 * scanline filters (None/Sub/Up/Average/Paeth) are reconstructed and alpha
 * is dropped, producing flat RGB bytes compatible with {@link sixelEncode}.
 *
 * Compression is handled by Node's built-in `zlib` (via
 * `process.getBuiltinModule`, same pattern as {@link nodeFs}).
 */

/** A decoded PNG image. */
export interface DecodedPng {
  width: number;
  height: number;
  /** Flat `width * height * 3` RGB bytes, rows top-to-bottom. */
  rgb: Uint8Array;
}

/** Options for {@link decodePng}. */
export interface PngDecodeOptions {
  /**
   * Maximum number of pixels (`width * height`) to decode. Prevents
   * decompression bombs from untrusted PNG files.
   */
  maxPixels?: number;
}

/** Default pixel budget for PNG decoding (24 MB of RGB data). */
export const DEFAULT_MAX_PNG_PIXELS = 8_000_000;

/** Hard cap for a single image dimension (avoids overflow/abuse). */
const MAX_DIMENSION = 10_000;

interface PngChunk {
  type: number;
  data: Uint8Array;
}

const IHDR = 0x49484452; // 'IHDR'
const IDAT = 0x49444154; // 'IDAT'
const IEND = 0x49454e44; // 'IEND'

const PNG_SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10];

/** Fetch `node:zlib` lazily (browser-safe import, like `node:fs`). */
function nodeZlib(): { inflateSync(data: Uint8Array): Buffer } | null {
  if (typeof process !== 'undefined' && typeof process.getBuiltinModule === 'function') {
    return process.getBuiltinModule('node:zlib') as { inflateSync(data: Uint8Array): Buffer };
  }
  try {
    const req = (globalThis as { require?: (id: string) => unknown }).require;
    return req ? (req('node:zlib') as { inflateSync(data: Uint8Array): Buffer }) : null;
  } catch {
    return null;
  }
}

/**
 * Decode a PNG file into RGB bytes.
 *
 * @param buffer - The raw PNG file bytes.
 * @param options - Decoding limits (pixel budget).
 * @returns The decoded image, or null when the input is not a supported PNG.
 */
export function decodePng(
  buffer: Uint8Array,
  options: PngDecodeOptions = {},
): DecodedPng | null {
  if (buffer.length < 8) return null;
  for (let i = 0; i < 8; i++) {
    if (buffer[i] !== PNG_SIGNATURE[i]) return null;
  }

  const chunks = parseChunks(buffer);
  if (chunks.length === 0) return null;

  const header = chunks[0];
  if (header.type !== IHDR || header.data.length < 13) return null;

  const width = readU32(header.data, 0);
  const height = readU32(header.data, 4);
  const bitDepth = header.data[8]!;
  const colorType = header.data[9]!;
  const interlace = header.data[12]!;

  if (width <= 0 || height <= 0 || bitDepth !== 8 || interlace !== 0) return null;

  // Reject dimensions that are absurd or exceed the decode budget before
  // allocating anything. Untrusted PNGs can otherwise cause huge allocations
  // or decompression bombs.
  if (width > MAX_DIMENSION || height > MAX_DIMENSION) return null;
  const maxPixels = options.maxPixels ?? DEFAULT_MAX_PNG_PIXELS;
  if (width * height > maxPixels) return null;

  const channels =
    colorType === 0 ? 1 : colorType === 2 ? 3 : colorType === 4 ? 2 : colorType === 6 ? 4 : 0;
  if (channels === 0) return null;

  const zlib = nodeZlib();
  if (!zlib) return null;

  let compressed: Uint8Array = new Uint8Array(0);
  for (const chunk of chunks) {
    if (chunk.type === IDAT) {
      const merged = new Uint8Array(compressed.length + chunk.data.length);
      merged.set(compressed, 0);
      merged.set(chunk.data, compressed.length);
      compressed = merged;
    }
  }
  if (compressed.length === 0) return null;

  let raw: Uint8Array;
  try {
    raw = new Uint8Array(zlib.inflateSync(compressed));
  } catch {
    return null;
  }

  const stride = width * channels;
  const expected = (stride + 1) * height;
  if (raw.length < expected) return null;

  const rgb = new Uint8Array(width * height * 3);
  const prevLine = new Uint8Array(stride);
  const line = new Uint8Array(stride);
  let offset = 0;

  for (let y = 0; y < height; y++) {
    const filter = raw[offset]!;
    offset++;
    for (let x = 0; x < stride; x++) {
      const rawByte = raw[offset + x]!;
      line[x] = unfilter(filter, x, rawByte, line, prevLine, channels);
    }
    offset += stride;

    for (let x = 0; x < width; x++) {
      const src = x * channels;
      const dst = (y * width + x) * 3;
      rgb[dst] = line[src]!;
      rgb[dst + 1] = channels >= 3 ? line[src + 1]! : line[src]!;
      rgb[dst + 2] = channels >= 3 ? line[src + 2]! : line[src]!;
    }

    prevLine.set(line);
  }

  return { width, height, rgb };
}

function parseChunks(buffer: Uint8Array): PngChunk[] {
  const chunks: PngChunk[] = [];
  let offset = 8;
  while (offset + 12 <= buffer.length) {
    const length = readU32(buffer, offset);
    if (offset + 12 + length > buffer.length) break;
    const type = readU32(buffer, offset + 4);
    chunks.push({ type, data: buffer.slice(offset + 8, offset + 8 + length) });
    offset += 12 + length;
    if (type === IEND) break;
  }
  return chunks;
}

function readU32(bytes: Uint8Array, offset: number): number {
  return (
    ((bytes[offset] ?? 0) << 24) |
    ((bytes[offset + 1] ?? 0) << 16) |
    ((bytes[offset + 2] ?? 0) << 8) |
    (bytes[offset + 3] ?? 0)
  );
}

function paeth(a: number, b: number, c: number): number {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

function unfilter(
  filter: number,
  x: number,
  raw: number,
  line: Uint8Array,
  prev: Uint8Array,
  channels: number,
): number {
  const left = x >= channels ? line[x - channels]! : 0;
  const up = prev[x]!;
  const upLeft = x >= channels ? prev[x - channels]! : 0;
  switch (filter) {
    case 1:
      return (raw + left) & 0xff;
    case 2:
      return (raw + up) & 0xff;
    case 3:
      return (raw + ((left + up) >> 1)) & 0xff;
    case 4:
      return (raw + paeth(left, up, upLeft)) & 0xff;
    default:
      return raw;
  }
}
