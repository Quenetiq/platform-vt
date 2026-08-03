import { Directive, effect, ElementRef, inject, input } from '@angular/core';
import { RenderService } from '../services/render.service';
import { STYLE_READER, type VTStyleReader } from '../styles/style-registry';
import { applyHostStyles } from './apply-host-styles';

/**
 * Host directive exposing border inputs.
 *
 * Writes `border`, `border-left` and `border-radius` attributes on the host
 * element for the renderer.
 */
@Directive({ selector: '[vtBorder]' })
export class VtBorderDirective {
  readonly border = input<string>('');
  readonly borderLeft = input<string>('');
  readonly borderRadius = input<number | string>(0);

  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly renderService = inject(RenderService);
  private readonly styleReader = inject(STYLE_READER) as VTStyleReader;

  constructor() {
    effect(() => {
      const el = this.elementRef.nativeElement;
      applyHostStyles(el, this.styleReader, el.tagName.toLowerCase(), {
        border: { value: this.border(), default: '' },
        borderLeft: { value: this.borderLeft(), default: '' },
        borderRadius: { value: this.borderRadius(), default: 0 },
      });
      this.renderService.scheduleRender();
    });
  }
}
