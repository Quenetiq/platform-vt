import { DestroyRef, Injectable, inject, NgZone, makeEnvironmentProviders, signal, type EnvironmentProviders } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject } from 'rxjs';
import { osc } from '../output/ansi';
import { InputService } from './input.service';
import { TerminalService } from './terminal.service';

/** OSC 52 clipboard response: `ESC ] 52 ; c ; <base64> ST` */
const OSC52_RE = /\x1b\]52;c;([A-Za-z0-9+/=]*)(?:\x07|\x1b\\)/;

/**
 * Reads and writes the system clipboard via the OSC 52 protocol.
 *
 * - {@link copy} writes text; terminals that support OSC 52 writes put it in
 *   the system clipboard (only when the app is in the foreground).
 * - {@link read} requests the clipboard content; the terminal replies with an
 *   OSC 52 sequence on stdin, which is parsed into {@link clipboards} /
 *   {@link lastClipboard}.
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

  constructor() {
    this.input.rawInput
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((data) => {
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
   * Copy text to the system clipboard (OSC 52 write).
   *
   * @param text - The text to copy.
   */
  copy(text: string): void {
    this.terminal.write(osc.clipboardWrite(text));
  }

  /**
   * Request the current clipboard content. The reply arrives asynchronously
   * on {@link clipboards} / {@link lastClipboard}.
   */
  read(): void {
    this.terminal.write(osc.clipboardRead());
  }
}

/**
 * Provide the clipboard handling service.
 */
export function provideClipboardService(): EnvironmentProviders {
  return makeEnvironmentProviders([ClipboardService]);
}