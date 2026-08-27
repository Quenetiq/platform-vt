import { Component, inject, input, effect, ElementRef } from '@angular/core';
import { RenderService } from '../../services/render.service';

export type BadgeVariant = 'info' | 'success' | 'warning' | 'danger' | 'neutral';

const VARIANT_COLOR: Record<BadgeVariant, string> = {
  info: 'cyan',
  success: 'green',
  warning: 'yellow',
  danger: 'red',
  neutral: 'gray',
};

/**
 * A small status pill: `● label` with a variant color.
 *
 * @example
 * ```html
 * <vt-badge label="Deployed" variant="success"></vt-badge>
 * ```
 */
@Component({
  selector: 'vt-badge',
  template: '',
})
export class BadgeComponent {
  private readonly elementRef = inject(ElementRef);
  private readonly renderService = inject(RenderService);

  readonly label = input.required<string>();
  readonly variant = input<BadgeVariant>('neutral');
  /** Show a dot glyph before the label (default `true`). */
  readonly dot = input<boolean>(true);

  constructor() {
    effect(() => {
      const el = this.elementRef.nativeElement as HTMLElement;
      const glyph = this.dot() ? '\u25CF ' : '';
      const text = `${glyph}${this.label()}`;
      el.setAttribute('display', 'block');
      el.setAttribute('flex-shrink', '0');
      el.setAttribute('content', text);
      el.textContent = text;
      el.setAttribute('color', VARIANT_COLOR[this.variant()]);
      this.renderService.scheduleRender();
    });
  }
}