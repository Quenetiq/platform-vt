import { Directive, effect, ElementRef, inject, input } from '@angular/core';
import { RenderService } from '../services/render.service';
import { STYLE_READER, type VTStyleReader } from '../styles/style-registry';
import { applyHostStyles } from './apply-host-styles';

/**
 * Host directive exposing spacing inputs.
 *
 * Writes `padding`, `margin` and `gap` attributes on the host element for the
 * layout engine.
 */
@Directive({ selector: '[vtSpacing]' })
export class VtSpacingDirective {
  readonly padding = input<number | string>(0);
  readonly margin = input<number | string>(0);
  readonly gap = input<number>(0);

  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly renderService = inject(RenderService);
  private readonly styleReader = inject(STYLE_READER) as VTStyleReader;

  constructor() {
    effect(() => {
      const el = this.elementRef.nativeElement;
      applyHostStyles(el, this.styleReader, el.tagName.toLowerCase(), {
        padding: { value: this.padding(), default: 0 },
        margin: { value: this.margin(), default: 0 },
        gap: { value: this.gap(), default: 0 },
      });
      this.renderService.scheduleRender();
    });
  }
}
