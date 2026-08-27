const COLOR_MAP: Record<string, string> = {
  black: '0',
  red: '1',
  green: '2',
  yellow: '3',
  blue: '4',
  magenta: '5',
  cyan: '6',
  white: '7',
  gray: '8',
  grey: '8',
  'bright-red': '9',
  'bright-green': '10',
  'bright-yellow': '11',
  'bright-blue': '12',
  'bright-magenta': '13',
  'bright-cyan': '14',
  'bright-white': '15',
};

/**
 * Resolve a color name to an ANSI escape code.
 *
 * Supports standard colors (0-7), gray/grey (8), and bright colors (9-15).
 * Returns `null` for unknown color names.
 *
 * @param name - Color name (case-insensitive).
 * @param type - `'fg'` for foreground, `'bg'` for background.
 * @returns The ANSI escape string, or `null` if unknown.
 *
 * @example
 * ```typescript
 * resolveColor('red', 'fg');  // '\x1b[31m'
 * resolveColor('bright-blue', 'bg');  // '\x1b[104m'
 * ```
 */
export function resolveColor(
  name: string,
  type: 'fg' | 'bg',
): string | null {
  const key = name.toLowerCase();
  if (!(key in COLOR_MAP)) {
    const rgb = parseColor(name);
    if (rgb) return rgbSequence(rgb, type);
    return null;
  }
  const index = COLOR_MAP[key];

  const numIndex = Number(index);
  if (numIndex < 8) {
    const code = type === 'fg' ? 30 + numIndex : 40 + numIndex;
    return `\x1b[${String(code)}m`;
  }
  // bright colors: fg 90-97, bg 100-107
  const offset = numIndex - 8;
  const code = type === 'fg' ? 90 + offset : 100 + offset;
  return `\x1b[${String(code)}m`;
}

/**
 * Wrap text with foreground or background color ANSI codes.
 *
 * @param text - The text to wrap.
 * @param name - Color name (case-insensitive).
 * @param type - `'fg'` for foreground, `'bg'` for background.
 * @returns The wrapped text, or original text if color is unknown.
 *
 * @example
 * ```typescript
 * wrapColor('Hello', 'red', 'fg');  // '\x1b[31mHello\x1b[39m'
 * ```
 */
export function wrapColor(
  text: string,
  name: string,
  type: 'fg' | 'bg',
): string {
  const code = resolveColor(name, type);
  if (!code) return text;
  return `${code}${text}\x1b[${type === 'fg' ? '39' : '49'}m`;
}

/**
 * Exact RGB values for every named color. Emitting 24-bit color (`\x1b[38;2;R;G;Bm`
 * / `\x1b[48;2;R;G;Bm`) renders identically on every modern terminal, independent
 * of how the terminal maps its 16-color ANSI palette. This matters for dark
 * themes where `gray` (bright black) is often drawn as near-black.
 */
const COLOR_RGB: Record<string, [number, number, number]> = {
  black: [0, 0, 0],
  red: [205, 49, 49],
  green: [56, 179, 100],
  yellow: [201, 173, 47],
  blue: [52, 122, 219],
  magenta: [211, 84, 160],
  cyan: [40, 166, 176],
  white: [200, 200, 200],
  gray: [105, 105, 105],
  grey: [105, 105, 105],
  'bright-red': [255, 90, 90],
  'bright-green': [110, 220, 150],
  'bright-yellow': [250, 235, 120],
  'bright-blue': [140, 180, 255],
  'bright-magenta': [255, 160, 210],
  'bright-cyan': [120, 220, 230],
  'bright-white': [255, 255, 255],
};

/**
 * Resolve a color name to a 24-bit RGB ANSI escape code.
 *
 * Unlike {@link resolveColor}, the emitted value is an exact RGB color that
 * does not depend on the terminal's ANSI palette mapping.
 *
 * @param name - Color name (case-insensitive).
 * @param type - `'fg'` for foreground, `'bg'` for background.
 * @returns The ANSI escape string, or `null` if unknown.
 *
 * @example
 * ```typescript
 * resolveColorRgb('gray', 'bg');  // '\x1b[48;2;105;105;105m'
 * resolveColorRgb('bright-white', 'fg');  // '\x1b[38;2;255;255;255m'
 * ```
 */
export function resolveColorRgb(
  name: string,
  type: 'fg' | 'bg',
): string | null {
  const rgb = COLOR_RGB[name.toLowerCase()] ?? parseColor(name);
  if (!rgb) return null;
  const prefix = type === 'fg' ? '38' : '48';
  const [r, g, b] = rgb;
  return `\x1b[${prefix};2;${r};${g};${b}m`;
}

/**
 * Parse a raw color value into RGB components.
 *
 * Supports `#RRGGBB`, shorthand `#RGB`, and `rgb(r, g, b)` forms, in addition
 * to the named colors handled separately by {@link COLOR_RGB}.
 *
 * @param value - The raw color value.
 * @returns `[r, g, b]` or `null` if the value is not a valid color.
 */
function parseColor(value: string): [number, number, number] | null {
  const trimmed = value.trim();

  const hexMatch = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.exec(trimmed);
  if (hexMatch) {
    const hex = hexMatch[1];
    if (hex.length === 3) {
      return [
        parseInt(hex[0] + hex[0], 16),
        parseInt(hex[1] + hex[1], 16),
        parseInt(hex[2] + hex[2], 16),
      ];
    }
    return [
      parseInt(hex.slice(0, 2), 16),
      parseInt(hex.slice(2, 4), 16),
      parseInt(hex.slice(4, 6), 16),
    ];
  }

  const rgbMatch = /^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/.exec(trimmed);
  if (rgbMatch) {
    return [
      Math.min(255, Number(rgbMatch[1])),
      Math.min(255, Number(rgbMatch[2])),
      Math.min(255, Number(rgbMatch[3])),
    ];
  }

  return null;
}

function rgbSequence(
  rgb: [number, number, number],
  type: 'fg' | 'bg',
): string {
  const prefix = type === 'fg' ? '38' : '48';
  return `\x1b[${prefix};2;${rgb[0]};${rgb[1]};${rgb[2]}m`;
}

/**
 * Wrap text with an exact RGB foreground or background color.
 *
 * @param text - The text to wrap.
 * @param name - Color name (case-insensitive).
 * @param type - `'fg'` for foreground, `'bg'` for background.
 * @returns The wrapped text, or original text if color is unknown.
 *
 * @example
 * ```typescript
 * wrapColorRgb('Hello', 'bright-white', 'fg');  // '\x1b[38;2;255;255;255mHello\x1b[39m'
 * ```
 */
export function wrapColorRgb(
  text: string,
  name: string,
  type: 'fg' | 'bg',
): string {
  const code = resolveColorRgb(name, type);
  if (!code) return text;
  return `${code}${text}\x1b[${type === 'fg' ? '39' : '49'}m`;
}

/**
 * How many colors the current terminal can render.
 */
export type ColorMode = 16 | 256 | 'truecolor';

const ANSI16_RGB: [number, number, number][] = [
  [0, 0, 0], // black
  [205, 49, 49], // red
  [56, 179, 100], // green
  [201, 173, 47], // yellow
  [52, 122, 219], // blue
  [211, 84, 160], // magenta
  [40, 166, 176], // cyan
  [200, 200, 200], // white
  [105, 105, 105], // gray / bright black
  [255, 90, 90], // bright red
  [110, 220, 150], // bright green
  [250, 235, 120], // bright yellow
  [140, 180, 255], // bright blue
  [255, 160, 210], // bright magenta
  [120, 220, 230], // bright cyan
  [255, 255, 255], // bright white
];

/** ANSI palette index → color name (mirrors {@link COLOR_MAP}). */
const ANSI16_NAMES = [
  'black',
  'red',
  'green',
  'yellow',
  'blue',
  'magenta',
  'cyan',
  'white',
  'gray',
  'bright-red',
  'bright-green',
  'bright-yellow',
  'bright-blue',
  'bright-magenta',
  'bright-cyan',
  'bright-white',
];

/**
 * Map an RGB color to the closest index in the standard 256-color palette.
 *
 * The palette is the well-known xterm cube: 16 system colors, then a 6×6×6
 * cube, then a 24-step grayscale ramp.
 *
 * @param r - Red channel 0-255.
 * @param g - Green channel 0-255.
 * @param b - Blue channel 0-255.
 * @returns The palette index 0-255.
 */
export function rgbTo256(r: number, g: number, b: number): number {
  if (r === g && g === b) {
    // Grayscale: either a cube gray level or the dedicated grayscale ramp.
    if (r < 8) return 16;
    if (r > 248) return 231;
    const v = Math.round((r - 8) / 10);
    return 232 + v;
  }
  const toCube = (v: number): number => {
    if (v < 48) return 0;
    if (v < 114) return 1;
    return Math.min(5, Math.round((v - 35) / 40));
  };
  const ri = toCube(r);
  const gi = toCube(g);
  const bi = toCube(b);
  return 16 + 36 * ri + 6 * gi + bi;
}

/**
 * Map an RGB color to the closest of the 16 basic ANSI colors.
 *
 * Uses simple Euclidean distance in RGB space.
 *
 * @returns The ANSI color index 0-15.
 */
export function rgbToNearest16(r: number, g: number, b: number): number {
  let best = 0;
  let bestDist = Infinity;
  for (let i = 0; i < ANSI16_RGB.length; i++) {
    const [cr, cg, cb] = ANSI16_RGB[i]!;
    const dr = cr - r;
    const dg = cg - g;
    const db = cb - b;
    const dist = dr * dr + dg * dg + db * db;
    if (dist < bestDist) {
      bestDist = dist;
      best = i;
    }
  }
  return best;
}

function rgbCode(index: number, type: 'fg' | 'bg'): string {
  const prefix = type === 'fg' ? '38' : '48';
  return `\x1b[${prefix};5;${String(index)}m`;
}

/**
 * Resolve a color name to an ANSI code adapted to the terminal's color
 * capabilities.
 *
 * In `'truecolor'` mode named colors and `#hex`/`rgb()` values emit exact
 * 24-bit codes ({@link resolveColorRgb}). In `256` mode arbitrary colors are
 * snapped to the xterm 256-color palette. In `16` mode they are snapped to
 * the nearest of the 16 basic ANSI colors.
 *
 * The special name `256:<index>` (e.g. `'256:42'`) explicitly selects a
 * palette entry in `256`/`'truecolor'` mode and is snapped to the nearest
 * basic color in `16` mode.
 *
 * @param name - Color name, `#hex`, `rgb(r,g,b)` or `256:<index>`.
 * @param type - `'fg'` for foreground, `'bg'` for background.
 * @param mode - The terminal's color capability.
 * @returns The ANSI escape string, or `null` if the color is unknown.
 *
 * @example
 * ```typescript
 * resolveColorAdaptive('red', 'fg', 16);           // '\x1b[31m'
 * resolveColorAdaptive('#ff8800', 'fg', 256);      // '\x1b[38;5;214m'
 * resolveColorAdaptive('#ff8800', 'fg', 'truecolor'); // '\x1b[38;2;255;136;0m'
 * ```
 */
export function resolveColorAdaptive(
  name: string,
  type: 'fg' | 'bg',
  mode: ColorMode,
): string | null {
  const key = name.toLowerCase();
  const explicit256 = /^256:(\d{1,3})$/.exec(key);
  if (explicit256) {
    const index = Math.min(255, Number(explicit256[1]));
    if (mode === 16) {
      return resolveColor(String(index < 8 ? index : index >= 232 ? 7 : (index % 16)), type);
    }
    return rgbCode(index, type);
  }

  if (mode === 'truecolor') return resolveColorRgb(name, type);

  const rgb = COLOR_RGB[key] ?? parseColor(name);
  if (rgb) {
    if (mode === 256) return rgbCode(rgbTo256(rgb[0], rgb[1], rgb[2]), type);
    return resolveColor(ANSI16_NAMES[rgbToNearest16(rgb[0], rgb[1], rgb[2])]!, type);
  }

  // Known named colors always resolve through the standard palette.
  return resolveColor(name, type);
}

/**
 * Wrap text with a color adapted to the terminal's capabilities.
 *
 * @param text - The text to wrap.
 * @param name - Color name, `#hex`, `rgb(r,g,b)` or `256:<index>`.
 * @param type - `'fg'` for foreground, `'bg'` for background.
 * @param mode - The terminal's color capability.
 * @returns The wrapped text, or the original text if the color is unknown.
 */
export function wrapColorAdaptive(
  text: string,
  name: string,
  type: 'fg' | 'bg',
  mode: ColorMode,
): string {
  const code = resolveColorAdaptive(name, type, mode);
  if (!code) return text;
  return `${code}${text}\x1b[${type === 'fg' ? '39' : '49'}m`;
}
