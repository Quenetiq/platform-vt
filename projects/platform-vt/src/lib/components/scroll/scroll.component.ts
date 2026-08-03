import { Component, effect, ElementRef, inject, input } from '@angular/core';
import { VtLayoutDirective } from '../../directives/flex-layout.directive';
import { VtSizingDirective } from '../../directives/sizing.directive';
import { VtSpacingDirective } from '../../directives/spacing.directive';
import { RenderService } from '../../services/render.service';

/**
 * A scrollable viewport for terminal content.
 *
 * Wraps child content in a fixed-size viewport. Children keep their natural
 * sizes and overflow is clipped; by default the newest content is pinned to
 * the bottom of the viewport (chat-style). Pass a numeric `scrollTop` to pin
 * to an absolute offset instead. Size comes from the forwarded sizing inputs
 * (`[width]`, `[height]`) or from `flexGrow`.
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

  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly renderService = inject(RenderService);

  constructor() {
    effect(() => {
      const el = this.elementRef.nativeElement;
      const v = this.scrollTop();
      el.setAttribute('overflow', 'scroll');
      if (typeof v === 'number') {
        el.setAttribute('scroll-top', String(v));
      } else {
        el.removeAttribute('scroll-top');
      }
      this.renderService.scheduleRender();
    });
  }
}
