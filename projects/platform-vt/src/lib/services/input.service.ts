import { DestroyRef, Injectable, inject, NgZone, signal } from '@angular/core';
import { Subject } from 'rxjs';
import { stripSgrSequences } from './sgr-mouse';
import { TerminalService } from './terminal.service';

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
  '\x1b[3~': 'delete',
  '\x1b[5~': 'page-up',
  '\x1b[6~': 'page-down',
  '\x1b[H': 'home',
  '\x1b[F': 'end',
  '\t': 'tab',
  '\x1b[Z': 'shift-tab',
  '\x03': 'ctrl-c',
  '\x04': 'ctrl-d',
  '\x06': 'ctrl-f',
  '\x02': 'ctrl-b',
  '\x17': 'ctrl-w',
};

/**
 * Splits an incoming data chunk into individual keys so that multi-character
 * chunks (e.g. fast typing or pasted text over a pipe) still produce one event
 * per keypress. Escape sequences are matched greedily from {@link KEY_MAP}.
 */
export function splitInputKeys(data: string): string[] {
  const keys: string[] = [];
  let i = 0;
  while (i < data.length) {
    if (data[i] === '\x1b') {
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
      keys.push(data[i]);
      i++;
    }
  }
  return keys;
}

/**
 * Parses keyboard input from stdin and emits {@link VTKeyEvent} objects.
 *
 * Sets the terminal to raw mode and listens for data events.
 * Runs inside NgZone so Angular change detection picks up signal updates.
 *
 * @example
 * ```typescript
 * const input = inject(InputService);
 * input.keyEvents.pipe(filter(e => e.name === 'return')).subscribe(() => {
 *   console.log('Enter pressed');
 * });
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

  /** Signal holding the most recent key event. */
  readonly lastKey = signal<VTKeyEvent | null>(null);

  /** Observable stream of parsed key events. */
  readonly keyEvents = this.keySubject.asObservable();

  constructor() {
    this.setupInput();

    this.destroyRef.onDestroy(() => {
      this.keySubject.complete();
      this.rawInput.complete();
    });
  }

  private setupInput(): void {
    if (typeof process === 'undefined') return;
    if (!process.stdin) return;

    try {
      if (typeof (process.stdin as { setRawMode?: (flag: boolean) => void }).setRawMode === 'function') {
        (process.stdin as { setRawMode: (flag: boolean) => void }).setRawMode(true);
      }
    } catch {
      // Ignore — raw mode is unavailable (e.g. piped stdin), key parsing still works.
    }

    process.stdin.resume();
    process.stdin.setEncoding('utf8');

    process.stdin.on('data', (data: string) => {
      this.rawInput.next(data);

      const cleaned = stripSgrSequences(data);
      const keys = splitInputKeys(cleaned);
      if (keys.length === 0) return;

      this.ngZone.run(() => {
        for (const key of keys) {
          const event = this.parseKey(key);
          this.lastKey.set(event);
          this.keySubject.next(event);
        }
      });
    });
  }

  private parseKey(data: string): VTKeyEvent {
    const name = this.getKeyName(data);
    const code = data.charCodeAt(0);
    const ctrl = code < 32 || data.startsWith('\x1b');
    const meta = data.startsWith('\x1b') && data.length > 1;
    const shift = false;

    return { name, ctrl, meta, shift, sequence: data };
  }

  private getKeyName(data: string): string {
    return KEY_MAP[data] ?? data;
  }
}
