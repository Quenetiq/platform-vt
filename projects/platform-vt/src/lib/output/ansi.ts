/**
 * ANSI escape sequence prefix.
 */
export const ESC = '\x1b[';

/**
 * Cursor movement helpers.
 *
 * @example
 * ```typescript
 * import { cursor } from '@quenetiq/platform-vt';
 * process.stdout.write(cursor.moveTo(0, 0));
 * process.stdout.write(cursor.hide());
 * ```
 */
export const cursor = {
  /** Move cursor to (x, y) position. Coordinates are 0-indexed. */
  moveTo: (x: number, y: number): string => `${ESC}${String(Math.floor(y) + 1)};${String(Math.floor(x) + 1)}H`,
  /** Hide the terminal cursor. */
  hide: (): string => `${ESC}?25l`,
  /** Show the terminal cursor. */
  show: (): string => `${ESC}?25h`,
  /** Save the current cursor position. */
  save: (): string => `${ESC}s`,
  /** Restore the previously saved cursor position. */
  restore: (): string => `${ESC}u`,
  /** Move cursor up by n rows. */
  moveUp: (n = 1): string => `${ESC}${String(n)}A`,
  /** Move cursor down by n rows. */
  moveDown: (n = 1): string => `${ESC}${String(n)}B`,
  /** Move cursor right by n columns. */
  moveRight: (n = 1): string => `${ESC}${String(n)}C`,
  /** Move cursor left by n columns. */
  moveLeft: (n = 1): string => `${ESC}${String(n)}D`,
};

/**
 * Screen/line erase helpers.
 */
export const erase = {
  /** Erase the entire screen. */
  screen: (): string => `${ESC}2J`,
  /** Erase the current line. */
  line: (): string => `${ESC}2K`,
  /** Erase from cursor to end of line. */
  lineFromCursor: (): string => `${ESC}K`,
  /** Erase from cursor to bottom of screen. */
  below: (): string => `${ESC}J`,
  /** Erase from cursor to top of screen. */
  above: (): string => `${ESC}1J`,
};

/**
 * Foreground color helpers. Each wraps a string with the appropriate ANSI codes.
 *
 * @example
 * ```typescript
 * import { fg } from '@quenetiq/platform-vt';
 * process.stdout.write(fg.red('Error!'));
 * process.stdout.write(fg.rgb(255, 128, 0, 'Orange text'));
 * ```
 */
export const fg = {
  black: (s: string): string => `${ESC}30m${s}${ESC}39m`,
  red: (s: string): string => `${ESC}31m${s}${ESC}39m`,
  green: (s: string): string => `${ESC}32m${s}${ESC}39m`,
  yellow: (s: string): string => `${ESC}33m${s}${ESC}39m`,
  blue: (s: string): string => `${ESC}34m${s}${ESC}39m`,
  magenta: (s: string): string => `${ESC}35m${s}${ESC}39m`,
  cyan: (s: string): string => `${ESC}36m${s}${ESC}39m`,
  white: (s: string): string => `${ESC}37m${s}${ESC}39m`,
  gray: (s: string): string => `${ESC}90m${s}${ESC}39m`,
  /** 24-bit RGB foreground color. */
  rgb: (r: number, g: number, b: number, s: string): string =>
    `${ESC}38;2;${String(r)};${String(g)};${String(b)}m${s}${ESC}39m`,
};

/**
 * Background color helpers. Each wraps a string with the appropriate ANSI codes.
 */
export const bg = {
  black: (s: string): string => `${ESC}40m${s}${ESC}49m`,
  red: (s: string): string => `${ESC}41m${s}${ESC}49m`,
  green: (s: string): string => `${ESC}42m${s}${ESC}49m`,
  yellow: (s: string): string => `${ESC}43m${s}${ESC}49m`,
  blue: (s: string): string => `${ESC}44m${s}${ESC}49m`,
  magenta: (s: string): string => `${ESC}45m${s}${ESC}49m`,
  cyan: (s: string): string => `${ESC}46m${s}${ESC}49m`,
  white: (s: string): string => `${ESC}47m${s}${ESC}49m`,
  /** 24-bit RGB background color. */
  rgb: (r: number, g: number, b: number, s: string): string =>
    `${ESC}48;2;${String(r)};${String(g)};${String(b)}m${s}${ESC}49m`,
};

/**
 * Text decoration helpers.
 */
export const txt = {
  bold: (s: string): string => `${ESC}1m${s}${ESC}22m`,
  dim: (s: string): string => `${ESC}2m${s}${ESC}22m`,
  italic: (s: string): string => `${ESC}3m${s}${ESC}23m`,
  underline: (s: string): string => `${ESC}4m${s}${ESC}24m`,
  strikethrough: (s: string): string => `${ESC}9m${s}${ESC}29m`,
};

/** Reset all terminal styling to defaults. */
export const reset = (): string => `${ESC}0m`;
