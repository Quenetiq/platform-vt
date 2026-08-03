import { Directive, effect, ElementRef, inject, input } from '@angular/core';
import { RenderService } from '../services/render.service';
import { STYLE_READER, type VTStyleReader } from '../styles/style-registry';
import { applyHostStyles } from './apply-host-styles';

/**
 * Host directive exposing explicit width/height inputs.
 *
 * Writes `width` and `height` attributes on the host element for the layout
 * engine. Kept separate from {@link VtLayoutDirective} so components can own a
 * conflicting `height` input (e.g. {@link ScrollViewComponent}).
 */
@Directive({ selector: '[vtSizing]' })
export class VtSizingDirective {
  readonly width = input<number | string>('auto');
  readonly height = input<number | string>('auto');

  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly renderService = inject(RenderService);
  private readonly styleReader = inject(STYLE_READER) as VTStyleReader;

  constructor() {
    effect(() => {
      const el = this.elementRef.nativeElement;
      applyHostStyles(el, this.styleReader, el.tagName.toLowerCase(), {
        width: { value: this.width(), default: 'auto' },
        height: { value: this.height(), default: 'auto' },
      });
      this.renderService.scheduleRender();
    });
  }
}
