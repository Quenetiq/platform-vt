import { Directive, effect, ElementRef, inject, input } from '@angular/core';
import { RenderService } from '../services/render.service';
import { STYLE_READER, type VTStyleReader } from '../styles/style-registry';
import { applyHostStyles } from './apply-host-styles';

/**
 * Host directive exposing text-specific formatting inputs.
 *
 * Writes `font-style`, `text-decoration`, `opacity` and `wrap` attributes on
 * the host element for the renderer. Used by {@link TextComponent}.
 */
@Directive({ selector: '[vtTypography]' })
export class VtTypographyDirective {
  readonly fontStyle = input<string>('');
  readonly textDecoration = input<string>('');
  readonly opacity = input<string>('');
  readonly wrap = input<string>('');

  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly renderService = inject(RenderService);
  private readonly styleReader = inject(STYLE_READER) as VTStyleReader;

  constructor() {
    effect(() => {
      const el = this.elementRef.nativeElement;
      applyHostStyles(el, this.styleReader, el.tagName.toLowerCase(), {
        fontStyle: { value: this.fontStyle(), default: '' },
        textDecoration: { value: this.textDecoration(), default: '' },
        opacity: { value: this.opacity(), default: '' },
        wrap: { value: this.wrap(), default: '' },
      });
      this.renderService.scheduleRender();
    });
  }
}
