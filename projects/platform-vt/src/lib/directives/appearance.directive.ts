import { Directive, effect, ElementRef, inject, input } from '@angular/core';
import { RenderService } from '../services/render.service';
import { STYLE_READER, type VTStyleReader } from '../styles/style-registry';
import { applyHostStyles } from './apply-host-styles';

/**
 * Host directive exposing color and text-formatting inputs.
 *
 * Writes `color`, `background-color`, `font-weight` and `text-align` attributes
 * on the host element for the renderer.
 */
@Directive({ selector: '[vtAppearance]' })
export class VtAppearanceDirective {
  readonly color = input<string>('');
  readonly backgroundColor = input<string>('');
  readonly fontWeight = input<string>('');
  readonly textAlign = input<string>('');

  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly renderService = inject(RenderService);
  private readonly styleReader = inject(STYLE_READER) as VTStyleReader;

  constructor() {
    effect(() => {
      const el = this.elementRef.nativeElement;
      applyHostStyles(el, this.styleReader, el.tagName.toLowerCase(), {
        color: { value: this.color(), default: '' },
        backgroundColor: { value: this.backgroundColor(), default: '' },
        fontWeight: { value: this.fontWeight(), default: '' },
        textAlign: { value: this.textAlign(), default: '' },
      });
      this.renderService.scheduleRender();
    });
  }
}
