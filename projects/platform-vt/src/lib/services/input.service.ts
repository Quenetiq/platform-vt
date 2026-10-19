import { DestroyRef, Injectable, inject, NgZone, signal } from '@angular/core';
import { Subject } from 'rxjs';
import { stripSgrSequences } from './sgr-mouse';
import { nextGraphemeIndex } from '../utils/graphemes';
import { TerminalService } from './terminal.service';
import {
  KITTY_POP,
  KITTY_PUSH,
  KITTY_QUERY,
  kittyQueryFlags,
  matchKittyKeySequence,
  matchKittyQueryResponse,
  parseKittyKey,
} from './kitty-keyboard';

/** Kitty graphics protocol support reply: `ESC _ G i = 1 ; <status> ST`. */
const KITTY_GRAPHICS_RE = /^\x1b_Gi=1;([A-Z]+)\x1b\\/;

/**
 * Represents a parsed keyboard event from the terminal.
 */
export interface VTKeyEvent {
  /** Key name: `'return'`, `'up'`, `'down'`, `'tab'`, `'ctrl-c'`, or the literal character. */
  name: string;
  /** Whether a Ctrl modifier was held. */
  ctrl: boolean;
  /** Whether a Meta/Alt modifier was held. */
  meta: boolean;
  /** Whether Shift was held. */
  shift: boolean;
  /** The raw input sequence. */
  sequence: string;
}

const KEY_MAP: Record<string, string> = {
  '\r': 'return',
  '\n': 'return',
  '\x1b[A': 'up',
  '\x1b[B': 'down',
  '\x1b[C': 'right',
  '\x1b[D': 'left',
  '\x7f': 'backspace',
  '\x08': 'backspace',
  '\x1b[3~': 'delete',
  '\x1b[5~': 'page-up',
  '\x1b[6~': 'page-down',
  '\x1b[H': 'home',
  '\x1b[F': 'end',
  '\t': 'tab',
  '\x1b[Z': 'shift-tab',
  '\x1b[I': 'focus',
  '\x1b[O': 'blur',
  '\x03': 'ctrl-c',
  '\x04': 'ctrl-d',
  '\x06': 'ctrl-f',
  '\x02': 'ctrl-b',
  '\x17': 'ctrl-w',
  '\x1b': 'escape',
};

/**
 * Splits an incoming data chunk into individual keys so that multi-character
 * chunks (e.g. fast typing or pasted text over a pipe) still produce one event
 * per keypress. Escape sequences are matched greedily from {@link KEY_MAP}.
 *
 * When `kitty` is true, kitty-protocol sequences (`CSI u` and friends) are
 * matched first; on terminals without kitty support they never appear, so
 * the legacy path is unaffected.
 */
export function splitInputKeys(data: string, kitty = false): string[] {
  const keys: string[] = [];
  let i = 0;
  while (i < data.length) {
    if (data[i] === '\x1b') {
      if (kitty) {
        const kittySeq = matchKittyKeySequence(data.substring(i));
        if (kittySeq) {
          keys.push(kittySeq);
          i += kittySeq.length;
          continue;
        }
      }
      let matched = '';
      for (let end = data.length; end > i; end--) {
        const seq = data.substring(i, end);
        if (Object.hasOwn(KEY_MAP, seq)) {
          matched = seq;
          break;
        }
      }
      if (matched.length > 0) {
        keys.push(matched);
        i += matched.length;
      } else {
        keys.push('\x1b');
        i++;
      }
    } else {
      // Emit one key per grapheme cluster so emoji/combining marks arrive as
      // a single event instead of broken UTF-16 halves.
      const end = nextGraphemeIndex(data, i);
      keys.push(data.substring(i, end));
      i = end;
    }
  }
  return keys;
}

/**
 * Parses keyboard input from stdin and emits {@link VTKeyEvent} objects.
 *
 * Sets the terminal to raw mode and listens for data events. When bracketed
 * paste is enabled (the default via {@link bootstrapTerminal}), pasted text
 * arrives wrapped in `\x1b[200~ ... \x1b[201~` and is emitted as a single
 * `paste` event instead of a burst of key events.
 *
 * Runs inside NgZone so Angular change detection picks up signal updates.
 *
 * @example
 * ```typescript
 * const input = inject(InputService);
 * input.keyEvents.pipe(filter(e => e.name === 'return')).subscribe(() => {
 *   console.log('Enter pressed');
 * });
 * input.pastes.subscribe((text) => console.log('pasted:', text));
 * ```
 */
@Injectable()
export class InputService {
  private readonly terminal = inject(TerminalService);
  private readonly ngZone = inject(NgZone);
  private readonly destroyRef = inject(DestroyRef);

  private readonly keySubject = new Subject<VTKeyEvent>();

  /** Raw stdin data chunks, including mouse sequences. Consumed by {@link MouseService}. */
  readonly rawInput = new Subject<string>();

  /** Observable stream of completed paste events (bracketed paste). */
  readonly pastes = new Subject<string>();

  /** Signal holding the most recent paste text (or null). */
  readonly lastPaste = signal<string | null>(null);

  /** Signal holding the most recent key event. */
  readonly lastKey = signal<VTKeyEvent | null>(null);

  /** Observable stream of parsed key events. */
  readonly keyEvents = this.keySubject.asObservable();

  /** Terminal focus changes (CSI ?1004 reporting): 'focus' | 'blur'. */
  readonly focusEvents = new Subject<'focus' | 'blur'>();

  /** Signal holding the most recent focus event (or null). */
  readonly lastFocus = signal<'focus' | 'blur' | null>(null);

  /** Buffered paste content while a bracketed paste is in progress. */
  private pasteBuffer: string | null = null;

  /** Whether the kitty keyboard protocol was requested (push sent). */
  private kittyRequested = false;

  /** Timer waiting for the terminal's kitty support response. */
  private kittyTimer: ReturnType<typeof setTimeout> | null = null;

  /** Signal holding whether the kitty keyboard protocol is active. */
  readonly kittyKeyboardEnabled = signal(false);

  /** Kitty graphics support: true/false after a query, null while unknown. */
  readonly kittyGraphics = signal<boolean | null>(null);

  constructor() {
    this.setupInput();

    this.destroyRef.onDestroy(() => {
      if (this.kittyRequested) {
        this.terminal.write(KITTY_POP);
      }
      this.keySubject.complete();
      this.rawInput.complete();
      this.pastes.complete();
      this.focusEvents.complete();
    });
  }

  /**
   * Inject a synthetic key event as if it came from stdin.
   *
   * Useful for tests and scripted automation: the event goes through the
   * same `keyEvents` stream as real keypresses.
   */
  simulateKey(event: VTKeyEvent): void {
    this.ngZone.run(() => {
      this.lastKey.set(event);
      this.keySubject.next(event);
    });
  }

  /**
   * Opt into the kitty keyboard protocol (disambiguated key events).
   *
   * Pushes keyboard mode with the "disambiguate escape codes" flag and
   * queries the terminal for support. When supported, modified keys arrive
   * as unambiguous `CSI u` sequences with explicit Ctrl/Shift/Alt bits
   * (Ctrl+I becomes distinguishable from Tab, Ctrl+Shift+letter works, etc.).
   * When the terminal replies it does not support the protocol, key parsing
   * stays on the legacy path.
   *
   * Idempotent; the keyboard mode is popped (restored) on destroy.
   */
  enableKittyKeyboard(): void {
    if (this.kittyRequested) return;
    this.kittyRequested = true;
    this.terminal.write(KITTY_PUSH + KITTY_QUERY);

    // If the terminal does not reply within 150ms it does not support the
    // protocol; keys keep arriving in legacy form.
    this.kittyTimer = setTimeout(() => {
      this.kittyTimer = null;
    }, 150);
  }

  private setupInput(): void {
    if (typeof process === 'undefined') return;
    if (!process.stdin) return;

    this.terminal.setRawMode(true);

    process.stdin.resume();
    process.stdin.setEncoding('utf8');

    process.stdin.on('data', (data: string) => {
      this.rawInput.next(data);
      this.ngZone.run(() => {
        this.handleChunk(data);
      });
    });
  }

  /** Route a stdin chunk: kitty response, paste framing, then key parsing. */
  private handleChunk(data: string): void {
    const PASTE_START = '\x1b[200~';
    const PASTE_END = '\x1b[201~';

    // Protocol replies are consumed, never surfaced as keys.
    data = this.consumeKittyQueryResponse(data);
    data = this.consumeKittyGraphicsResponse(data);
    if (data.length === 0) return;

    // Mid-paste: accumulate until the closing sequence.
    if (this.pasteBuffer !== null) {
      const endIndex = data.indexOf(PASTE_END);
      if (endIndex === -1) {
        this.pasteBuffer += data;
        return;
      }
      this.pasteBuffer += data.substring(0, endIndex);
      this.emitPaste(this.pasteBuffer);
      this.pasteBuffer = null;
      const rest = data.substring(endIndex + PASTE_END.length);
      if (rest.length > 0) this.handleChunk(rest);
      return;
    }

    // Paste start (possibly with content before it in the same chunk).
    const startIndex = data.indexOf(PASTE_START);
    if (startIndex !== -1) {
      const before = data.substring(0, startIndex);
      if (before.length > 0) this.processKeys(before);

      const after = data.substring(startIndex + PASTE_START.length);
      const endIndex = after.indexOf(PASTE_END);
      if (endIndex === -1) {
        this.pasteBuffer = after;
        return;
      }
      this.emitPaste(after.substring(0, endIndex));
      const rest = after.substring(endIndex + PASTE_END.length);
      if (rest.length > 0) this.handleChunk(rest);
      return;
    }

    this.processKeys(data);
  }

  private emitPaste(text: string): void {
    if (text.length === 0) return;
    this.lastPaste.set(text);
    this.pastes.next(text);
  }

  private processKeys(data: string): void {
    const cleaned = stripSgrSequences(data);
    const keys = splitInputKeys(cleaned, this.kittyRequested);
    if (keys.length === 0) return;

    for (const key of keys) {
      if (key === '\x1b[I' || key === '\x1b[O') {
        const event = key === '\x1b[I' ? 'focus' : 'blur';
        this.ngZone.run(() => {
          this.lastFocus.set(event);
          this.focusEvents.next(event);
        });
        continue;
      }
      const event = this.parseKey(key);
      this.lastKey.set(event);
      this.keySubject.next(event);
    }
  }

  private parseKey(data: string): VTKeyEvent {
    if (this.kittyRequested) {
      const kitty = parseKittyKey(data);
      if (kitty) return kitty;
    }

    const name = this.getKeyName(data);
    const code = data.charCodeAt(0);
    const ctrl = code < 32 || data.startsWith('\x1b');
    const meta = data.startsWith('\x1b') && data.length > 1;
    const shift = false;

    return { name, ctrl, meta, shift, sequence: data };
  }

  /**
   * Query kitty graphics protocol support (`ESC _ G i = 1 ; q = 1`).
   *
   * The terminal replies `OK` (supported) or an error code; the result is
   * exposed on {@link kittyGraphics}.
   */
  queryKittyGraphics(): void {
    this.terminal.write('\x1b_Gi=1,q=1;\x1b\\');
  }

  private consumeKittyGraphicsResponse(data: string): string {
    const match = KITTY_GRAPHICS_RE.exec(data);
    if (!match) return data;
    this.ngZone.run(() => {
      this.kittyGraphics.set(match[1] === 'OK');
    });
    return data.substring(match[0].length);
  }

  private consumeKittyQueryResponse(data: string): string {
    const response = matchKittyQueryResponse(data);
    if (!response) return data;

    const flags = kittyQueryFlags(response);
    if (flags !== null) {
      this.kittyKeyboardEnabled.set((flags & 1) !== 0);
      if (this.kittyTimer) {
        clearTimeout(this.kittyTimer);
        this.kittyTimer = null;
      }
    }
    return data.substring(response.length);
  }

  private getKeyName(data: string): string {
    const mapped = KEY_MAP[data];
    if (mapped) return mapped;
    // Legacy control bytes (Ctrl+A .. Ctrl+Z) map to their letter names so
    // keymap bindings like 'ctrl-z' work on terminals without the kitty
    // protocol; the kitty parser produces the same names explicitly.
    const code = data.charCodeAt(0);
    if (code >= 1 && code <= 26) return String.fromCharCode(code + 96);
    return data;
  }
}
