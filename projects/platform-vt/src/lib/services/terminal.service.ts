import { Injectable, signal } from '@angular/core';
import {
  cursor,
  mode,
  osc,
  type CursorShape,
  type TerminalProgressState,
} from '../output/ansi';

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
    [
      'iTerm.app',
      'WezTerm',
      'vscode',
      'warp',
      'ghostty',
      'tabby',
      'hyper',
      'alacritty',
      'mintty',
      'rio',
    ].includes(termProgram) ||
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

  /** Current window title (null when the app did not set one). */
  readonly title = signal<string | null>(null);

  /** Taskbar progress state (OSC 9;4). */
  readonly progress = signal<{ state: TerminalProgressState; value: number } | null>(null);

  /** Current cursor shape requested by the app. */
  readonly cursorShape = signal<CursorShape>('default');

  /** Flash timer handle (visual bell). */
  private flashTimer: ReturnType<typeof setTimeout> | null = null;

  /** Whether the title was pushed on the terminal's title stack. */
  private titlePushed = false;

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

  /**
   * Set the terminal window/tab title (OSC 2).
   *
   * The title is restored to the previous one by {@link cleanup} when it was
   * saved with {@link pushTitle}.
   */
  setTitle(title: string): void {
    this.title.set(title);
    this.write(osc.title(title));
  }

  /** Save the current window title on the terminal's title stack (CSI 22 t). */
  pushTitle(): void {
    if (this.titlePushed) return;
    this.titlePushed = true;
    this.write(mode.pushTitle());
  }

  /** Restore the title saved by {@link pushTitle} (CSI 23 t). */
  restoreTitle(): void {
    if (!this.titlePushed) return;
    this.titlePushed = false;
    this.title.set(null);
    this.write(mode.popTitle());
  }

  /** Ring the terminal bell. */
  bell(): void {
    this.write('\x07');
  }

  /**
   * Flash the screen (visual bell).
   *
   * Uses the terminal's reverse-video flash mode (`CSI ?5h`), automatically
   * disabling it after `durationMs`. Unsupported terminals ignore it.
   */
  flash(durationMs = 120): void {
    this.write(mode.flash());
    if (this.flashTimer) clearTimeout(this.flashTimer);
    this.flashTimer = setTimeout(() => {
      this.flashTimer = null;
      this.write(mode.exitFlash());
    }, Math.max(0, durationMs));
  }

  /**
   * Show a desktop notification (OSC 9).
   *
   * @param body - Notification text.
   * @param title - Optional title prepended to the body.
   */
  notify(body: string, title?: string): void {
    this.write(osc.notification(body, title));
  }

  /**
   * Report taskbar progress (OSC 9;4).
   *
   * @param state - `'remove'`, `'normal'`, `'error'`, `'indeterminate'` or
   * `'warning'`.
   * @param value - Percentage (0-100) for percentage states.
   */
  setProgress(state: TerminalProgressState, value = 0): void {
    const percent = Math.max(0, Math.min(100, Math.round(value)));
    this.progress.set(state === 'remove' ? null : { state, value: percent });
    this.write(osc.progress(state, percent));
  }

  /** Clear the taskbar progress indicator. */
  clearProgress(): void {
    if (this.progress() === null) return;
    this.progress.set(null);
    this.write(osc.progress('remove'));
  }

  /**
   * Set the cursor shape/blink (DECSCUSR).
   *
   * @param style - `'default'`, `'block'`, `'underline'` or `'bar'`.
   * @param blink - Whether the cursor blinks.
   */
  setCursorStyle(style: CursorShape, blink = true): void {
    this.cursorShape.set(style);
    this.write(cursor.shape(style, blink));
  }

  /** Mark the start of a prompt (OSC 133;A) for shell integration. */
  markPromptStart(): void {
    this.write('\x1b]133;A\x1b\\');
  }

  /** Mark the start of a command (OSC 133;B) for shell integration. */
  markCommandStart(): void {
    this.write('\x1b]133;B\x1b\\');
  }

  /** Mark the start of command output (OSC 133;C) for shell integration. */
  markCommandOutputStart(): void {
    this.write('\x1b]133;C\x1b\\');
  }

  /**
   * Mark the end of a command (OSC 133;D) for shell integration.
   *
   * Terminals with shell integration (kitty, wezterm, tmux with
   * `terminal-overrides`, iTerm2) use these markers to navigate the
   * scrollback by prompt/output. The exit status is included when nonzero.
   */
  markCommandEnd(status = 0): void {
    this.write(`\x1b]133;D${status ? `;status=${String(status)}` : ''}\x1b\\`);
  }

  /** Switch to the alternative screen buffer (idempotent). */
  enterAltScreen(): void {
    if (this.isAltScreen()) return;
    this.isAltScreen.set(true);
    this.write(mode.altScreen());
    this.clear();
  }

  /** Whether synchronized output is active. */
  readonly isSynchronizedOutput = signal(false);

  /**
   * Enable synchronized output (`CSI ?2026h`): the terminal holds screen
   * updates until the matching end sequence, painting one frame instead of
   * a flickery sequence of partial redraws. Unsupported terminals ignore
   * the sequence safely.
   */
  enableSynchronizedOutput(): void {
    if (this.isSynchronizedOutput()) return;
    this.isSynchronizedOutput.set(true);
    this.write('\x1b[?2026h');
  }

  /** Disable synchronized output (`CSI ?2026l`). */
  disableSynchronizedOutput(): void {
    if (!this.isSynchronizedOutput()) return;
    this.isSynchronizedOutput.set(false);
    this.write('\x1b[?2026l');
  }

  /**
   * Run a function with screen updates batched into a single frame.
   *
   * Emits the synchronized-output begin/end sequences around the call, so a
   * full render pass (layout, diff, flush) is painted atomically.
   */
  synchronized<T>(fn: () => T): T {
    const active = this.isSynchronizedOutput();
    if (active) this.beginSynchronizedOutputWrite();
    try {
      return fn();
    } finally {
      if (active) this.endSynchronizedOutputWrite();
    }
  }

  private beginSynchronizedOutputWrite(): void {
    this.write('\x1b[?2026h');
  }

  private endSynchronizedOutputWrite(): void {
    this.write('\x1b[?2026l');
  }

  /** Return to the normal screen buffer (idempotent). */
  exitAltScreen(): void {
    if (!this.isAltScreen()) return;
    this.isAltScreen.set(false);
    this.write(mode.exitAltScreen());
  }

  /** Whether focus reporting (`CSI ?1004h`) is active. */
  readonly isFocusReporting = signal(false);

  /**
   * Enable focus reporting: the terminal sends `CSI I` when it gains focus
   * and `CSI O` when it loses it. Handled by {@link InputService} into the
   * `focusEvents` stream.
   */
  enableFocusReporting(): void {
    if (this.isFocusReporting()) return;
    this.isFocusReporting.set(true);
    this.write('\x1b[?1004h');
  }

  /** Disable focus reporting (`CSI ?1004l`). */
  disableFocusReporting(): void {
    if (!this.isFocusReporting()) return;
    this.isFocusReporting.set(false);
    this.write('\x1b[?1004l');
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
    this.clearProgress();
    if (this.cursorShape() !== 'default') {
      this.setCursorStyle('default');
    }
    if (this.flashTimer) {
      clearTimeout(this.flashTimer);
      this.flashTimer = null;
      this.write(mode.exitFlash());
    }
    this.restoreTitle();
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
