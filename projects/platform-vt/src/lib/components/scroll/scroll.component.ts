import {
  Component,
  effect,
  ElementRef,
  inject,
  input,
  output,
  signal,
  linkedSignal,
  DestroyRef,
} from '@angular/core';
import { VtLayoutDirective } from '../../directives/flex-layout.directive';
import { VtSizingDirective } from '../../directives/sizing.directive';
import { VtSpacingDirective } from '../../directives/spacing.directive';
import { RenderService } from '../../services/render.service';
import { WheelService } from '../../services/wheel.service';
import { createIdGenerator } from '../../cdk/dom';

/**
 * A scrollable viewport for terminal content.
 *
 * Wraps child content in a fixed-size viewport. Children keep their natural
 * sizes and overflow is clipped; by default the newest content is pinned to
 * the bottom of the viewport (chat-style). Pass a numeric `scrollTop` to pin
 * to an absolute offset instead; `scrollChange` reports the current offset
 * (`'bottom'` or a number) whenever it changes, so apps can persist it.
 * Mouse wheel scrolling is supported when the {@link WheelService} is
 * provided: scrolling up pins the viewport, scrolling back to the bottom
 * re-enables bottom pinning.
 *
 * @example
 * ```html
 * <vt-scroll flexDirection="column" [flexGrow]="1" [gap]="1"
 *   (scrollChange)="saveScroll($event)">
 *   <vt-text>Long content...</vt-text>
 * </vt-scroll>
 * ```
 */
@Component({
  selector: 'vt-scroll',
  template: `
    <div class="vt-scroll-body"><ng-content></ng-content></div>
    @if (showScrollbar()) {
      <div class="vt-scroll-track"></div>
    }
  `,
  hostDirectives: [
    {
      directive: VtLayoutDirective,
      inputs: ['flexDirection', 'justifyContent', 'alignItems', 'flexGrow', 'flexShrink'],
    },
    { directive: VtSizingDirective, inputs: ['width', 'height'] },
    { directive: VtSpacingDirective, inputs: ['padding', 'margin', 'gap'] },
  ],
})
export class ScrollViewComponent {
  /** Scroll offset in rows, or `'bottom'` (default) to pin to the newest content. */
  readonly scrollTop = input<number | 'bottom'>('bottom');

  /** Horizontal scroll offset in columns, or `'right'` to pin to the end. */
  readonly scrollLeft = input<number | 'right'>(0);

  /** Whether horizontal wheel events pan the viewport. */
  readonly horizontal = input<boolean>(false);

  /** Whether the mouse wheel can scroll this viewport (requires WheelService). */
  readonly wheelScroll = input<boolean>(true);

  /** Show a scrollbar indicator on the right edge. */
  readonly showScrollbar = input<boolean>(false);

  /** Emits the current offset (`number | 'bottom'`) when it changes. */
  readonly scrollChange = output<number | 'bottom'>();

  /** Emits the current horizontal offset (`number | 'right'`) when it changes. */
  readonly scrollLeftChange = output<number | 'right'>();

  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly renderService = inject(RenderService);
  private readonly destroyRef = inject(DestroyRef);

  /** Current scroll offset, or `'bottom'` while pinned to the newest content. */
  private readonly offset = signal<number | 'bottom'>('bottom');

  /** Current horizontal offset, or `'right'` while pinned to the end. */
  private readonly offsetX = linkedSignal<number | 'right'>(() => this.scrollLeft());

  constructor() {
    effect(() => {
      const el = this.elementRef.nativeElement as HTMLElement;
      const v = this.scrollTop();
      if (typeof v === 'number') {
        this.setOffset(v);
      }
      el.setAttribute('display', 'flex');
      el.setAttribute('flex-direction', 'row');
      el.setAttribute('flex-shrink', '0');
      el.setAttribute('gap', '1');

      // The body carries the scroll behavior; the host itself is a row of
      // [body, track].
      const body = el.querySelector<HTMLElement>('.vt-scroll-body');
      if (body) {
        body.setAttribute('display', 'flex');
        body.setAttribute('flex-direction', 'column');
        body.setAttribute('flex-grow', '1');
        body.setAttribute('flex-shrink', '1');
        body.setAttribute('align-self', 'stretch');
        body.setAttribute('overflow', 'scroll');
        const current = this.offset();
        if (current === 'bottom') {
          body.removeAttribute('scroll-top');
        } else {
          body.setAttribute('scroll-top', String(current));
        }
        const currentX = this.offsetX();
        if (currentX === 'right') body.setAttribute('scroll-left', 'right');
        else body.setAttribute('scroll-left', String(currentX));
      }

      const track = el.querySelector<HTMLElement>('.vt-scroll-track');
      if (track) {
        track.setAttribute('display', 'flex');
        track.setAttribute('flex-direction', 'column');
        track.setAttribute('flex-shrink', '0');
        track.setAttribute('width', '1');
        track.setAttribute('align-self', 'stretch');
      }
      this.renderService.scheduleRender();
    });

    // Keep the thumb in sync with the actual layout after every flush.
    this.renderService.onFlush(() => this.paintThumb());

    let wheel: WheelService | null = null;
    try {
      wheel = inject(WheelService);
    } catch {
      // WheelService not provided — wheel scrolling disabled.
    }

    const wheelId = createIdGenerator('vt-scroll')();
    if (wheel) {
      wheel.register({
        id: wheelId,
        element: this.elementRef.nativeElement,
        onWheel: (event) => {
          if (!this.wheelScroll()) return;
          const body = this.elementRef.nativeElement.querySelector<HTMLElement>('.vt-scroll-body');
          if (!body) return;
          const node = this.renderService.getElementLayout(body);
          const delta = event.scrollDirection === 'up' ? -1 : 1;

          if (event.scrollAxis === 'horizontal') {
            if (!this.horizontal()) return;
            const viewportW = node?.width ?? 1;
            const scrollWidth = node?.vtNode.styles.get('scrollWidth');
            const contentW = typeof scrollWidth === 'number' ? scrollWidth : viewportW;
            const maxLeft = Math.max(0, contentW - viewportW);
            const currentX = this.offsetX();
            const current = currentX === 'right' ? maxLeft : currentX;
            const next = Math.max(0, Math.min(maxLeft, current + delta));
            this.setOffsetX(next >= maxLeft ? 'right' : next);
            return;
          }

          const viewportH = node?.height ?? 1;
          const scrollHeight = node?.vtNode.styles.get('scrollHeight');
          const contentH = typeof scrollHeight === 'number' ? scrollHeight : viewportH;
          const maxTop = Math.max(0, contentH - viewportH);
          const offset = this.offset();
          const current = offset === 'bottom' ? maxTop : offset;
          const next = Math.max(0, Math.min(maxTop, current + delta));
          this.setOffset(next >= maxTop ? 'bottom' : next);
          this.renderService.scheduleRender();
        },
      });

      this.destroyRef.onDestroy(() => {
        wheel?.unregister(wheelId);
      });
    }
  }

  private setOffset(value: number | 'bottom'): void {
    const previous = this.offset();
    if (previous === value) return;
    this.offset.set(value);
    this.scrollChange.emit(value);
  }

  private setOffsetX(value: number | 'right'): void {
    const previous = this.offsetX();
    if (previous === value) return;
    this.offsetX.set(value);
    this.scrollLeftChange.emit(value);
    this.renderService.scheduleRender();
  }

  /** Paint the scrollbar thumb from the last rendered layout. */
  private paintThumb(): void {
    const el = this.elementRef.nativeElement as HTMLElement;
    const track = el.querySelector<HTMLElement>('.vt-scroll-track');
    const body = el.querySelector<HTMLElement>('.vt-scroll-body');
    if (!track || !body) return;

    const node = this.renderService.getElementLayout(body);
    const viewportH = node?.height ?? 1;
    const scrollHeight = node?.vtNode.styles.get('scrollHeight');
    const contentH = typeof scrollHeight === 'number' ? scrollHeight : viewportH;
    const maxTop = Math.max(0, contentH - viewportH);
    const offset = this.offset();
    const current = offset === 'bottom' ? maxTop : offset;

    const thumbH = maxTop === 0 ? viewportH : Math.max(1, Math.round((viewportH / contentH) * viewportH));
    const top = maxTop === 0 ? 0 : Math.round((current / maxTop) * (viewportH - thumbH));

    const rows: string[] = [];
    for (let y = 0; y < viewportH; y++) {
      rows.push(y >= top && y < top + thumbH ? '\u2588' : '\u2502');
    }
    const text = rows.join('\n');
    if (track.getAttribute('content') === text) return;
    track.setAttribute('content', text);
    track.textContent = text;
    // The layout of this frame saw an empty track; repaint once more so the
    // thumb rows are measured (the next flush sees the same text → stable).
    this.renderService.scheduleRender();
  }
}
