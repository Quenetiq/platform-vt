import { Component, effect, ElementRef, inject, input, signal, DestroyRef } from '@angular/core';
import { VtLayoutDirective } from '../../directives/flex-layout.directive';
import { VtSizingDirective } from '../../directives/sizing.directive';
import { VtSpacingDirective } from '../../directives/spacing.directive';
import { RenderService } from '../../services/render.service';
import { WheelService } from '../../services/wheel.service';

/**
 * A scrollable viewport for terminal content.
 *
 * Wraps child content in a fixed-size viewport. Children keep their natural
 * sizes and overflow is clipped; by default the newest content is pinned to
 * the bottom of the viewport (chat-style). Pass a numeric `scrollTop` to pin
 * to an absolute offset instead. Mouse wheel scrolling is supported when the
 * {@link WheelService} is provided: scrolling up pins the viewport, scrolling
 * back to the bottom re-enables bottom pinning.
 *
 * @example
 * ```html
 * <vt-scroll flexDirection="column" [flexGrow]="1" [gap]="1">
 *   <vt-text>Long content...</vt-text>
 * </vt-scroll>
 * ```
 */
@Component({
  selector: 'vt-scroll',
  template: `<ng-content></ng-content>`,
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

  /** Whether the mouse wheel can scroll this viewport (requires WheelService). */
  readonly wheelScroll = input<boolean>(true);

  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly renderService = inject(RenderService);
  private readonly destroyRef = inject(DestroyRef);

  /** Current scroll offset, or `'bottom'` while pinned to the newest content. */
  private readonly offset = signal<number | 'bottom'>('bottom');

  constructor() {
    effect(() => {
      const el = this.elementRef.nativeElement;
      const v = this.scrollTop();
      if (typeof v === 'number') {
        this.offset.set(v);
      }
      el.setAttribute('overflow', 'scroll');
      const current = this.offset();
      if (current === 'bottom') {
        el.removeAttribute('scroll-top');
      } else {
        el.setAttribute('scroll-top', String(current));
      }
      this.renderService.scheduleRender();
    });

    let wheel: WheelService | null = null;
    try {
      wheel = inject(WheelService);
    } catch {
      // WheelService not provided — wheel scrolling disabled.
    }

    const wheelId = `vt-scroll-${String(scrollId++)}`;
    if (wheel) {
      wheel.register({
        id: wheelId,
        element: this.elementRef.nativeElement,
        onWheel: (event) => {
          if (!this.wheelScroll()) return;
          const node = this.renderService.getElementLayout(this.elementRef.nativeElement);
          const viewportH = node?.height ?? 1;
          const scrollHeight = node?.vtNode.styles.get('scrollHeight');
          const contentH = typeof scrollHeight === 'number' ? scrollHeight : viewportH;
          const maxTop = Math.max(0, contentH - viewportH);
          const offset = this.offset();
          const current = offset === 'bottom' ? maxTop : offset;
          const delta = event.scrollDirection === 'up' ? -1 : 1;
          const next = Math.max(0, Math.min(maxTop, current + delta));
          this.offset.set(next >= maxTop ? 'bottom' : next);
          this.renderService.scheduleRender();
        },
      });

      this.destroyRef.onDestroy(() => {
        wheel?.unregister(wheelId);
      });
    }
  }
}

let scrollId = 0;