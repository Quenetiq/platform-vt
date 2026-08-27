import { Injectable, signal } from '@angular/core';
import { mode } from '../output/ansi';

/**
 * Color depth the terminal supports.
 */
export type ColorMode = 16 | 256 | 'truecolor';

/**
 * Detected terminal capabilities.
 */
export interface TerminalCapabilities {
  /** Color depth: 16, 256, or 24-bit truecolor. */
  colors: ColorMode;
  /** Whether the terminal is expected to render wide (CJK/emoji) glyphs. */
  unicode: boolean;
  /** Whether stdin/stdout are real TTYs. */
  isTTY: boolean;
  /** `TERM_PROGRAM` (iTerm.app, WezTerm, vscode...) or ''. */
  termProgram: string;
  /** `TERM` variable (xterm-256color, screen...) or ''. */
  term: string;
}

/**
 * Detect the terminal's capabilities from environment variables.
 *
 * Heuristics, in order of reliability:
 * 1. `COLORTERM=truecolor|24bit` → truecolor.
 * 2. `TERM` contains `256color` → 256.
 * 3. Known modern `TERM_PROGRAM` values without COLORTERM → truecolor.
 * 4. Otherwise 16 colors.
 */
export function detectCapabilities(): TerminalCapabilities {
  const term = process.env['TERM'] ?? '';
  const termProgram = process.env['TERM_PROGRAM'] ?? '';
  const colorterm = (process.env['COLORTERM'] ?? '').toLowerCase();

  let colors: ColorMode;
  if (colorterm === 'truecolor' || colorterm === '24bit') {
    colors = 'truecolor';
  } else if (term.includes('256color') || term.includes('256')) {
    colors = 256;
  } else if (
    ['iTerm.app', 'WezTerm', 'vscode', 'warp', 'ghostty', 'tabby', 'hyper', 'alacritty', 'mintty', 'rio'].includes(termProgram) ||
    /xterm-kitty|foot|contour|wezterm/i.test(term)
  ) {
    colors = 'truecolor';
  } else {
    colors = 16;
  }

  const unicode = !/^(dumb|cons25|vt100|vt52|linux)$/.test(term) && term !== '';

  return {
    colors,
    unicode,
    isTTY: Boolean(process.stdin?.isTTY && process.stdout?.isTTY),
    termProgram,
    term,
  };
}

/**
 * Provides terminal capabilities, dimensions, and low-level mode switching.
 *
 * ## Capabilities
 *
 * `capabilities()` is a signal computed once from environment variables:
 * color depth (16/256/truecolor), unicode support, and whether the process
 * runs on a real TTY. The renderer uses it to adapt output
 * ({@link resolveColorAdaptive}).
 *
 * ## Modes
 *
 * Fullscreen apps should call {@link enterAltScreen} (the normal screen is
 * preserved so scrollback survives), and {@link cleanup} restores every
 * terminal mode (alt screen, raw stdin, bracketed paste, cursor) — the
 * bootstrap function registers it on SIGINT/SIGTERM/exit automatically.
 *
 * @example
 * ```typescript
 * const terminal = inject(TerminalService);
 * if (terminal.capabilities().colors === 'truecolor') {
 *   // emit exact RGB colors
 * }
 * ```
 */
@Injectable({ providedIn: 'root' })
export class TerminalService {
  /** Current terminal width in columns. Updates on resize. */
  readonly columns = signal(80);

  /** Current terminal height in rows. Updates on resize. */
  readonly rows = signal(24);

  /** Detected terminal capabilities (stable for the process lifetime). */
  readonly capabilities = signal<TerminalCapabilities>({
    colors: 16,
    unicode: true,
    isTTY: false,
    termProgram: '',
    term: '',
  });

  /** Whether the alternative screen buffer is active. */
  readonly isAltScreen = signal(false);

  /** Whether raw mode is active on stdin. */
  readonly isRawMode = signal(false);

  /** Whether bracketed paste reporting is enabled. */
  readonly isBracketedPaste = signal(false);

  /** Listeners notified after a terminal resize. */
  private readonly resizeListeners = new Set<() => void>();

  /**
   * Register a callback invoked after every terminal resize.
   *
   * @returns A function that unregisters the callback.
   */
  onResize(listener: () => void): () => void {
    this.resizeListeners.add(listener);
    return () => this.resizeListeners.delete(listener);
  }

  constructor() {
    if (typeof process !== 'undefined') {
      try {
        this.capabilities.set(detectCapabilities());
      } catch {
        // Capability detection is best-effort.
      }
      this.applySize();

      process.stdout.on('resize', () => {
        this.applySize();
        for (const listener of this.resizeListeners) listener();
      });
    }
  }

  private applySize(): void {
    const columns = process.stdout.columns;
    const rows = process.stdout.rows;
    this.columns.set(columns > 0 ? columns : 80);
    this.rows.set(rows > 0 ? rows : 24);
  }

  /** Write raw data directly to stdout. */
  write(data: string): void {
    if (typeof process !== 'undefined') {
      process.stdout.write(data);
    }
  }

  /** Clear the entire terminal screen. */
  clear(): void {
    this.write('\x1b[2J\x1b[H');
  }

  /** Switch to the alternative screen buffer (idempotent). */
  enterAltScreen(): void {
    if (this.isAltScreen()) return;
    this.isAltScreen.set(true);
    this.write(mode.altScreen());
    this.clear();
  }

  /** Return to the normal screen buffer (idempotent). */
  exitAltScreen(): void {
    if (!this.isAltScreen()) return;
    this.isAltScreen.set(false);
    this.write(mode.exitAltScreen());
  }

  /** Enable raw mode on stdin (no line buffering, no echo). */
  setRawMode(enabled: boolean): void {
    if (typeof process === 'undefined' || !process.stdin) return;
    try {
      process.stdin.setRawMode(enabled);
      this.isRawMode.set(enabled);
    } catch {
      // Raw mode is unavailable (e.g. piped stdin).
    }
  }

  /** Enable bracketed paste reporting (idempotent). */
  enableBracketedPaste(): void {
    if (this.isBracketedPaste()) return;
    this.isBracketedPaste.set(true);
    this.write(mode.bracketedPaste());
  }

  /** Disable bracketed paste reporting (idempotent). */
  disableBracketedPaste(): void {
    if (!this.isBracketedPaste()) return;
    this.isBracketedPaste.set(false);
    this.write(mode.exitBracketedPaste());
  }

  /**
   * Restore the terminal to its original state.
   *
   * Exits the alternative screen buffer, shows the cursor, disables raw
   * mode and bracketed paste. Safe to call multiple times.
   */
  cleanup(): void {
    this.exitAltScreen();
    this.disableBracketedPaste();
    this.setRawMode(false);
    this.write('\x1b[?25h');
    try {
      if (typeof process !== 'undefined' && process.stdin) {
        process.stdin.pause();
      }
    } catch {
      // Ignore.
    }
  }
}