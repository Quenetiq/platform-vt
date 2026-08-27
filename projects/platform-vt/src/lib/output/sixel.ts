/**
 * Sixel image encoder: converts raw RGB pixels into sixel escape sequences.
 *
 * Sixels are the DEC VT340-era graphics protocol; modern terminals (foot,
 * mlterm, WezTerm, XTerm with `--vt340`) render them inline. Each sixel row
 * band is 6 pixels tall; every column paints one or more of the 6 pixels via
 * a bitmask character (`?`..`~`), with optional run-length compression
 * (`!<n><char>`). Colors are defined as registers (`#<i>;2;<r>;<g>;<b>`).
 *
 * The encoder quantizes each channel to 4 levels (0/85/170/255), so at most
 * 64 registers are used — compatible with all sixel terminals.
 */

/** Quantized RGB key → sixel register index. */
const COLOR_LEVELS = [0, 85, 170, 255];

/** Characters for bitmasks 0..63 (code point 63 + bits). */
const SIXEL_CHARS = '?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~';

function quantize(value: number): number {
  return Math.min(3, Math.max(0, Math.round(value / 85)));
}

function sixelChar(bits: number): string {
  return SIXEL_CHARS[bits] ?? '?';
}

/**
 * Encode RGB pixels (3 bytes per pixel, rows top-to-bottom) as a sixel
 * sequence.
 *
 * @param width - Image width in pixels.
 * @param height - Image height in pixels.
 * @param rgb - Flat RGB byte array of `width * height * 3` bytes.
 * @returns The DCS-wrapped sixel sequence (without the DCS terminator —
 * the caller appends `\x1b\\` when writing to the terminal).
 */
export function sixelEncode(width: number, height: number, rgb: Uint8Array): string {
  if (width <= 0 || height <= 0) return '';
  const out: string[] = [];
  const bands = Math.ceil(height / 6);

  for (let band = 0; band < bands; band++) {
    const bandRows = Math.min(6, height - band * 6);

    // Assign registers to quantized colors in order of first appearance.
    const registerByKey = new Map<number, number>();
    const registerRgb: number[][] = [];
    const registerKeys: number[] = [];
    const masks = new Map<number, Uint8Array>();

    const registerFor = (key: number): number => {
      let index = registerByKey.get(key);
      if (index === undefined) {
        index = registerRgb.length;
        registerByKey.set(key, index);
        registerKeys.push(key);
        registerRgb.push([
          COLOR_LEVELS[(key >> 4) & 3]!,
          COLOR_LEVELS[(key >> 2) & 3]!,
          COLOR_LEVELS[key & 3]!,
        ]);
        masks.set(key, new Uint8Array(width));
      }
      return index;
    };

    // Build bitmasks per color register.
    for (let x = 0; x < width; x++) {
      for (let row = 0; row < bandRows; row++) {
        const pixel = (band * 6 + row) * width + x;
        const r = quantize(rgb[pixel * 3]!);
        const g = quantize(rgb[pixel * 3 + 1]!);
        const b = quantize(rgb[pixel * 3 + 2]!);
        const key = (r << 4) | (g << 2) | b;
        registerFor(key);
        const mask = masks.get(key)!;
        mask[x] = (mask[x] ?? 0) | (1 << row);
      }
    }

    // Emit the register definitions used by this band.
    for (let index = 0; index < registerRgb.length; index++) {
      const [r, g, b] = registerRgb[index]!;
      out.push(`#${index};2;${r};${g};${b}`);
    }

    // Paint each register's columns with run-length compression.
    for (let index = 0; index < registerRgb.length; index++) {
      out.push(`#${index}`);
      const mask = masks.get(registerKeys[index]!)!;
      let x = 0;
      while (x < width) {
        const bits = mask[x]!;
        let run = 1;
        while (x + run < width && mask[x + run] === bits) run++;
        if (run > 1) out.push(`!${run}`);
        out.push(sixelChar(bits));
        x += run;
      }
      out.push('$');
    }

    if (band < bands - 1) out.push('-');
  }

  return out.join('');
}

/**
 * Build a full sixel write: DCS prefix + encoded data + ST terminator.
 *
 * @param width - Image width in pixels.
 * @param height - Image height in pixels.
 * @param rgb - Flat RGB byte array.
 * @returns The complete escape sequence to write to the terminal.
 */
export function sixelWrite(width: number, height: number, rgb: Uint8Array): string {
  return `\x1bPq${sixelEncode(width, height, rgb)}\x1b\\`;
}

/**
 * Parse a PPM P6 file into (width, height, rgb) pixel data.
 *
 * @param data - Raw file bytes.
 * @returns The pixel dimensions and flat RGB array.
 * @throws {Error} When the file is not a valid P6 PPM.
 */
export function parsePpmP6(data: Uint8Array): { width: number; height: number; rgb: Uint8Array } {
  const text = Buffer.from(data.subarray(0, Math.min(data.length, 128))).toString('ascii');
  if (!text.startsWith('P6')) throw new Error('Not a PPM P6 image');

  // Header: magic, width, height, maxval (whitespace/comments separated).
  const tokens: number[] = [];
  const binaryStart = (): number => {
    let index = 2;
    while (index < data.length) {
      const ch = data[index]!;
      if (ch === 0x23) {
        // comment until newline
        while (index < data.length && data[index] !== 0x0a) index++;
        continue;
      }
      if (ch === 0x20 || ch === 0x09 || ch === 0x0a || ch === 0x0d) {
        index++;
        continue;
      }
      break;
    }
    return index;
  };
  let index = binaryStart();
  for (let token = 0; token < 3; token++) {
    let value = 0;
    while (index < data.length && data[index]! >= 0x30 && data[index]! <= 0x39) {
      value = value * 10 + (data[index]! - 0x30);
      index++;
    }
    if (index >= data.length) throw new Error('Truncated PPM header');
    tokens.push(value);
    while (index < data.length) {
      const ch = data[index]!;
      if (ch === 0x23) {
        while (index < data.length && data[index] !== 0x0a) index++;
        continue;
      }
      if (ch === 0x20 || ch === 0x09 || ch === 0x0a || ch === 0x0d) {
        index++;
        continue;
      }
      break;
    }
  }

  const width = tokens[0]!;
  const height = tokens[1]!;
  if (width <= 0 || height <= 0) throw new Error('Invalid PPM dimensions');

  const rgb = data.subarray(index, index + width * height * 3);
  if (rgb.length < width * height * 3) throw new Error('Truncated PPM pixel data');
  return { width, height, rgb };
}