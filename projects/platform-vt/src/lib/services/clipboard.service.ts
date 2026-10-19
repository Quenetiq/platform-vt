import {
  DestroyRef,
  Injectable,
  inject,
  NgZone,
  makeEnvironmentProviders,
  signal,
  type EnvironmentProviders,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject } from 'rxjs';
import { osc } from '../output/ansi';
import { InputService } from './input.service';
import { TerminalService } from './terminal.service';

/** OSC 52 clipboard response: `ESC ] 52 ; c ; <base64> ST/BEL` */
const OSC52_RE = /\x1b\]52;c;([A-Za-z0-9+/=]*)(?:\x07|\x1b\\)/;

/** Kitty clipboard protocol (OSC 5522): read-reply packets. */
const KITTY_READ_RE =
  /\x1b\]5522;type=read:status=(OK|DONE|DATA:mime=([A-Za-z0-9+/=]*);([A-Za-z0-9+/=]*))(?:\x07|\x1b\\)/g;

/** OSC string terminator. */
const ST = '\x1b\\';

/** Chunk size for OSC 5522 payloads (before base64), per the kitty spec. */
const KITTY_CHUNK_SIZE = 4096;

/**
 * Reads and writes the system clipboard via the OSC 52 protocol (with
 * kitty's OSC 5522 extension as an automatic upgrade on kitty terminals,
 * whose default config blocks OSC 52 writes).
 *
 * - {@link copy} writes text; terminals that support the protocol put it in
 *   the system clipboard (only when the app is in the foreground). On kitty
 *   the OSC 5522 protocol is used instead (with a one-time permission
 *   prompt).
 * - {@link read} requests the clipboard content; the terminal replies with
 *   an OSC 52 sequence on stdin, which is parsed into {@link clipboards} /
 *   {@link lastClipboard}.
 * - {@link copyKitty}/{@link readKitty} expose the kitty OSC 5522 protocol
 *   explicitly (chunked writes, multi-MIME reads).
 *
 * @example
 * ```typescript
 * const clipboard = inject(ClipboardService);
 * clipboard.copy('select me');
 * clipboard.read();
 * clipboard.clipboards.subscribe((text) => console.log('clipboard:', text));
 * ```
 */
@Injectable()
export class ClipboardService {
  private readonly terminal = inject(TerminalService);
  private readonly input = inject(InputService);
  private readonly ngZone = inject(NgZone);
  private readonly destroyRef = inject(DestroyRef);

  /** Stream of clipboard contents received in response to {@link read}. */
  readonly clipboards = new Subject<string>();

  /** Signal holding the most recent clipboard content (or null). */
  readonly lastClipboard = signal<string | null>(null);

  /** Accumulated base64 chunks of the in-flight kitty read reply. */
  private kittyReadBuffer = '';

  constructor() {
    this.input.rawInput.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((data) => {
      this.consumeKittyReadReply(data);
      const match = OSC52_RE.exec(data);
      if (!match) return;
      let text = '';
      try {
        text = Buffer.from(match[1] ?? '', 'base64').toString('utf8');
      } catch {
        return;
      }
      this.ngZone.run(() => {
        this.lastClipboard.set(text);
        this.clipboards.next(text);
      });
    });

    this.destroyRef.onDestroy(() => {
      this.clipboards.complete();
    });
  }

  /**
   * Copy text to the system clipboard.
   *
   * Uses the kitty OSC 5522 protocol on kitty terminals (which block OSC 52
   * writes by default) and the OSC 52 protocol everywhere else.
   *
   * @param text - The text to copy.
   */
  copy(text: string): void {
    if (this.terminal.capabilities().term.toLowerCase() === 'xterm-kitty') {
      this.copyKitty(text);
    } else {
      this.terminal.write(osc.clipboardWrite(text));
    }
  }

  /**
   * Copy text via the kitty clipboard protocol (OSC 5522).
   *
   * The payload is chunked at 4096 bytes as required by the spec. kitty
   * asks the user once to allow clipboard access; the write completes
   * asynchronously (status is not observed).
   */
  copyKitty(text: string, mime = 'text/plain'): void {
    const bytes = Buffer.from(text, 'utf8');
    const mimeB64 = Buffer.from(mime, 'utf8').toString('base64');
    const parts: string[] = [`\x1b]5522;type=write${ST}`];
    for (let i = 0; i < bytes.length; i += KITTY_CHUNK_SIZE) {
      const chunk = bytes.subarray(i, i + KITTY_CHUNK_SIZE).toString('base64');
      parts.push(`\x1b]5522;type=wdata:mime=${mimeB64};${chunk}${ST}`);
    }
    parts.push(`\x1b]5522;type=wdata${ST}`);
    this.terminal.write(parts.join(''));
  }

  /**
   * Request the current clipboard content (OSC 52). The reply arrives
   * asynchronously on {@link clipboards} / {@link lastClipboard}.
   */
  read(): void {
    this.terminal.write(osc.clipboardRead());
  }

  /**
   * Request the clipboard content via the kitty protocol (OSC 5522 read).
   *
   * The reply (status=OK, then status=DATA packets, then status=DONE) is
   * parsed into {@link clipboards} / {@link lastClipboard} as the data of
   * the first requested MIME type.
   */
  readKitty(mimes: string[] = ['text/plain']): void {
    const payload = Buffer.from(mimes.join(' '), 'utf8').toString('base64');
    this.terminal.write(`\x1b]5522;type=read;${payload}${ST}`);
  }

  private consumeKittyReadReply(data: string): void {
    for (const match of data.matchAll(KITTY_READ_RE)) {
      const status = match[1] ?? '';
      if (status === 'OK') {
        this.kittyReadBuffer = '';
      } else if (status === 'DONE') {
        const text = this.kittyReadBuffer;
        this.kittyReadBuffer = '';
        try {
          const decoded = Buffer.from(text, 'base64').toString('utf8');
          this.ngZone.run(() => {
            this.lastClipboard.set(decoded);
            this.clipboards.next(decoded);
          });
        } catch {
          // Invalid base64 — ignore the reply.
        }
      } else if (status.startsWith('DATA:')) {
        this.kittyReadBuffer += match[3] ?? '';
      }
    }
  }
}

/**
 * Provide the clipboard handling service.
 */
export function provideClipboardService(): EnvironmentProviders {
  return makeEnvironmentProviders([ClipboardService]);
}
