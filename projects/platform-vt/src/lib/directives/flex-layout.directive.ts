import { Directive, effect, ElementRef, inject, input } from '@angular/core';
import { RenderService } from '../services/render.service';
import { STYLE_READER, type VTStyleReader } from '../styles/style-registry';
import { applyHostStyles } from './apply-host-styles';

/**
 * Host directive exposing flexbox layout inputs.
 *
 * Writes `flex-direction`, `justify-content`, `align-items`, `flex-grow` and
 * `flex-shrink` attributes on the host element for the layout engine.
 *
 * Used by {@link BoxComponent}, {@link TextComponent} and {@link ScrollViewComponent}.
 */
@Directive({ selector: '[vtLayout]' })
export class VtLayoutDirective {
  readonly flexDirection = input<string>('');
  readonly justifyContent = input<string>('');
  readonly alignItems = input<string>('');
  readonly flexGrow = input<number>(0);
  readonly flexShrink = input<number>(0);

  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly renderService = inject(RenderService);
  private readonly styleReader = inject(STYLE_READER) as VTStyleReader;

  constructor() {
    effect(() => {
      const el = this.elementRef.nativeElement;
      applyHostStyles(el, this.styleReader, el.tagName.toLowerCase(), {
        flexDirection: { value: this.flexDirection(), default: '' },
        justifyContent: { value: this.justifyContent(), default: '' },
        alignItems: { value: this.alignItems(), default: '' },
        flexGrow: { value: this.flexGrow(), default: 0 },
        flexShrink: { value: this.flexShrink(), default: 0 },
      });
      this.renderService.scheduleRender();
    });
  }
}
