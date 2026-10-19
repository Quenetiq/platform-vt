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
  moveTo: (x: number, y: number): string =>
    `${ESC}${String(Math.floor(y) + 1)};${String(Math.floor(x) + 1)}H`,
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
  /**
   * Set the cursor shape (DECSCUSR).
   *
   * @param style - `'block'`, `'underline'`, `'bar'` or `'default'`.
   * @param blink - Whether the cursor blinks.
   */
  shape: (style: CursorShape = 'default', blink = true): string => {
    const n =
      style === 'block'
        ? blink
          ? 1
          : 2
        : style === 'underline'
          ? blink
            ? 3
            : 4
          : style === 'bar'
            ? blink
              ? 5
              : 6
            : 0;
    return `${ESC}${String(n)} q`;
  },
};

/** Terminal cursor shape for {@link cursor.shape}. */
export type CursorShape = 'default' | 'block' | 'underline' | 'bar';

/** Progress state reported to the terminal taskbar (OSC 9;4). */
export type TerminalProgressState = 'remove' | 'normal' | 'error' | 'indeterminate' | 'warning';

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
  /** Reverse-video text (swap foreground and background). */
  inverse: (s: string): string => `${ESC}7m${s}${ESC}27m`,
};

/** Reset all terminal styling to defaults. */
export const reset = (): string => `${ESC}0m`;

/**
 * Terminal mode switching helpers (DECSET/DECRST).
 */
export const mode = {
  /** Use the alternative screen buffer (fullscreen apps). */
  altScreen: (): string => `${ESC}?1049h`,
  /** Return to the normal screen buffer. */
  exitAltScreen: (): string => `${ESC}?1049l`,
  /** Report paste events wrapped in `\x1b[200~ ... \x1b[201~`. */
  bracketedPaste: (): string => `${ESC}?2004h`,
  /** Stop reporting paste events. */
  exitBracketedPaste: (): string => `${ESC}?2004l`,
  /** Report application cursor keys (arrows emit `\x1bOA` etc.). */
  applicationCursorKeys: (): string => `${ESC}?1h`,
  /** Stop reporting application cursor keys. */
  exitApplicationCursorKeys: (): string => `${ESC}?1l`,
  /** Report focus events (`\x1b[I` / `\x1b[O`). */
  focusEvents: (): string => `${ESC}?1004h`,
  /** Stop reporting focus events. */
  exitFocusEvents: (): string => `${ESC}?1004l`,
  /** Save the window title on a stack (CSI 22 t). */
  pushTitle: (): string => `${ESC}22;2t`,
  /** Restore the previously saved window title (CSI 23 t). */
  popTitle: (): string => `${ESC}23;2t`,
  /** Start reverse-video flash (visual bell). */
  flash: (): string => `${ESC}?5h`,
  /** Stop reverse-video flash. */
  exitFlash: (): string => `${ESC}?5l`,
};

/**
 * OSC sequences (operating system commands).
 */
export const osc = {
  /**
   * Wrap text in an OSC 8 hyperlink. Terminals render the text as a clickable
   * link (usually Ctrl/Cmd+click to open).
   *
   * @param url - The target URL.
   * @param text - The visible link text.
   * @param id - Optional link id for grouping links.
   */
  hyperlink: (url: string, text: string, id?: string): string =>
    `\x1b]8;${id ? `id=${id};` : ''}${url}\x1b\\${text}\x1b]8;;\x1b\\`,
  /**
   * Copy text to the system clipboard (OSC 52).
   *
   * @param text - Text to copy. The terminal must support OSC 52 writes.
   */
  clipboardWrite: (text: string): string =>
    `\x1b]52;c;${Buffer.from(text, 'utf8').toString('base64')}\x07`,
  /** Request the current clipboard content (OSC 52 read). */
  clipboardRead: (): string => `\x1b]52;c;?\x07`,
  /**
   * Set the window title (OSC 2).
   *
   * The title is shown in the terminal's tab/window chrome.
   */
  title: (title: string): string => `\x1b]2;${title}\x07`,
  /**
   * Set both the icon name and the window title (OSC 0).
   */
  iconAndTitle: (title: string): string => `\x1b]0;${title}\x07`,
  /**
   * Show a desktop notification (OSC 9).
   *
   * Supported by iTerm2, WezTerm, ConEmu, Windows Terminal and others;
   * unsupported terminals ignore the sequence.
   */
  notification: (body: string, title?: string): string =>
    `\x1b]9;${title ? `${title}: ` : ''}${body}\x07`,
  /**
   * Report taskbar progress (OSC 9;4).
   *
   * @param state - `'remove'` clears the indicator, `'normal'`/`'error'`/
   * `'warning'` show a percentage, `'indeterminate'` shows an animated bar.
   * @param value - Progress percentage (0-100) for percentage states.
   */
  progress: (state: TerminalProgressState, value = 0): string => {
    const code =
      state === 'remove'
        ? 0
        : state === 'normal'
          ? 1
          : state === 'error'
            ? 2
            : state === 'indeterminate'
              ? 3
              : 4;
    const percent = Math.max(0, Math.min(100, Math.round(value)));
    return `\x1b]9;4;${String(code)};${String(percent)}\x07`;
  },
  /** Query the terminal's default foreground color (OSC 10). */
  queryForeground: (): string => '\x1b]10;?\x07',
  /** Query the terminal's default background color (OSC 11). */
  queryBackground: (): string => '\x1b]11;?\x07',
  /** Set the terminal's default foreground color (OSC 10). */
  setForeground: (color: string): string => `\x1b]10;${color}\x07`,
  /** Set the terminal's default background color (OSC 11). */
  setBackground: (color: string): string => `\x1b]11;${color}\x07`,
  /** Report the current working directory (OSC 7). */
  workingDirectory: (path: string, host = 'localhost'): string =>
    `\x1b]7;file://${host}${path.startsWith('/') ? path : `/${path}`}\x07`,
};
