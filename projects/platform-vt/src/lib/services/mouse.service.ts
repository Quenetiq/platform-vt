import { DestroyRef, Injectable, NgZone, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject } from 'rxjs';
import { InputService } from './input.service';
import { TerminalService } from './terminal.service';
import {
  extractSgrSequences,
  parseSgrMouse,
  trackClick,
  INITIAL_CLICK_TRACKER,
  type VTMouseEvent,
  type VTClickEvent,
  type ClickTracker,
} from './sgr-mouse';

/** Escape sequences used to enable/disable SGR mouse reporting. */
const ENABLE_MOUSE = '\x1b[?1006h\x1b[?1002h';
const DISABLE_MOUSE = '\x1b[?1002l\x1b[?1006l';

/**
 * Enables terminal mouse reporting and emits parsed mouse events.
 *
 * Turns on SGR button-event tracking (`\x1b[?1002h` + `\x1b[?1006h`) so the
 * terminal reports presses, releases and drags with pixel-accurate 0-based
 * coordinates over stdin. Raw data is read from {@link InputService.rawInput}
 * (the same stdin listener the keyboard service uses).
 *
 * @example
 * ```typescript
 * const mouse = inject(MouseService);
 * mouse.clicks.subscribe((click) => console.log('clicked', click.x, click.y));
 * ```
 */
@Injectable()
export class MouseService {
  private readonly input = inject(InputService);
  private readonly terminal = inject(TerminalService);
  private readonly ngZone = inject(NgZone);
  private readonly destroyRef = inject(DestroyRef);

  /** Stream of every parsed mouse event (down/up/move/scroll). */
  readonly mouseEvents = new Subject<VTMouseEvent>();

  /** Stream of completed clicks (press followed by release nearby). */
  readonly clicks = new Subject<VTClickEvent>();

  /** Signal holding the most recent raw mouse event. */
  readonly lastMouse = signal<VTMouseEvent | null>(null);

  /** Signal holding the most recent click. */
  readonly lastClick = signal<VTClickEvent | null>(null);

  private tracker: ClickTracker = INITIAL_CLICK_TRACKER;
  private enabled = false;

  constructor() {
    this.input.rawInput
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((data) => {
        for (const sequence of extractSgrSequences(data)) {
          const event = parseSgrMouse(sequence);
          if (!event) continue;
          this.handle(event);
        }
      });

    this.destroyRef.onDestroy(() => {
      this.disable();
      this.mouseEvents.complete();
      this.clicks.complete();
    });
  }

  /** Start reporting mouse events to the terminal (idempotent). */
  enable(): void {
    if (this.enabled) return;
    this.enabled = true;
    this.terminal.write(ENABLE_MOUSE);
  }

  /** Stop reporting mouse events and restore terminal state. */
  disable(): void {
    if (!this.enabled) return;
    this.enabled = false;
    this.terminal.write(DISABLE_MOUSE);
  }

  /** Whether mouse reporting is currently active. */
  isEnabled(): boolean {
    return this.enabled;
  }

  private handle(event: VTMouseEvent): void {
    this.ngZone.run(() => {
      this.lastMouse.set(event);
      this.mouseEvents.next(event);

      const { state, click } = trackClick(this.tracker, event);
      this.tracker = state;
      if (click) {
        this.lastClick.set(click);
        this.clicks.next(click);
      }
    });
  }
}
