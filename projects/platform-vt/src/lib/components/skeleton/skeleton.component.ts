import { Component, effect, ElementRef, inject, input, signal, DestroyRef } from '@angular/core';
import { RenderService } from '../../services/render.service';
import { TerminalService } from '../../services/terminal.service';
import { setCellText, syncChildren } from '../../cdk/dom';

/**
 * A loading placeholder: dimmed bars where content has not loaded yet.
 *
 * Renders `lines` rows of `█` bars, optionally pulsing (dimmed ⇄ normal)
 * while content is pending. With no `width` the bars fill the terminal
 * width; the last bar is shorter for a "text" look.
 *
 * @example
 * ```html
 * @if (loading()) {
 *   <vt-skeleton [lines]="5"></vt-skeleton>
 * } @else {
 *   <vt-table ...></vt-table>
 * }
 * ```
 */
@Component({
  selector: 'vt-skeleton',
  template: '',
})
export class SkeletonComponent {
  /** Number of placeholder rows. */
  readonly lines = input<number>(3);
  /** Bar width in columns; defaults to the full terminal width. */
  readonly width = input<number | null>(null);
  /** Pulse (dimmed ⇄ normal) while loading. */
  readonly pulse = input<boolean>(true);
  /** Pulse interval in milliseconds. */
  readonly pulseMs = input<number>(800);
  /** Color of the bars. */
  readonly color = input<string>('gray');

  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly renderService = inject(RenderService);
  private readonly terminal = inject(TerminalService);
  private readonly destroyRef = inject(DestroyRef);

  /** Whether the bars are currently dimmed (pulse phase). */
  private readonly dimmed = signal(false);

  constructor() {
    effect(() => {
      const el = this.elementRef.nativeElement as HTMLElement;
      const count = Math.max(1, this.lines());
      const width = this.width() ?? Math.max(1, this.terminal.columns() - 2);
      const color = this.color();
      const dimmed = this.dimmed();

      el.setAttribute('display', 'flex');
      el.setAttribute('flex-direction', 'column');
      el.setAttribute('flex-shrink', '0');
      el.setAttribute('gap', '1');

      const bars = syncChildren(el, count, 'vt-skeleton-bar', {
        display: 'block',
        'flex-shrink': '0',
        'min-height': '1',
      });

      for (let i = 0; i < count; i++) {
        const bar = bars[i]!;
        const isLast = i === count - 1;
        const barWidth = isLast ? Math.max(1, Math.floor(width * 0.6)) : width;
        setCellText(bar, '\u2588'.repeat(barWidth));
        bar.setAttribute('color', color);
        if (dimmed) bar.setAttribute('opacity', 'dim');
        else bar.removeAttribute('opacity');
      }
      this.renderService.scheduleRender();
    });

    if (this.pulse()) {
      const timer = setInterval(() => {
        this.dimmed.update((d) => !d);
      }, this.pulseMs());
      this.destroyRef.onDestroy(() => clearInterval(timer));
    }
  }
}
