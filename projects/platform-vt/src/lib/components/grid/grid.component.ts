import { Component, ElementRef, effect, inject, input } from '@angular/core';
import { RenderService } from '../../services/render.service';

/**
 * A responsive grid container.
 *
 * Children flow left to right into `columns` equal columns, then wrap to the
 * next row. Column widths are resolved by the terminal layout engine
 * (`display: grid`), and each row is as tall as its tallest cell.
 *
 * @example
 * ```html
 * <vt-grid [columns]="2" [gap]="1">
 *   <vt-box>Card 1</vt-box>
 *   <vt-box>Card 2</vt-box>
 *   <vt-box>Card 3</vt-box>
 * </vt-grid>
 * ```
 */
@Component({
  selector: 'vt-grid',
  template: '<ng-content></ng-content>',
})
export class GridComponent {
  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly renderService = inject(RenderService);

  /** Number of equal columns, or explicit widths (`"10 20 1fr"`). */
  readonly columns = input<number | string>(2);

  /** Gap between columns and rows. */
  readonly gap = input<number>(0);

  /** Inner padding. */
  readonly padding = input<number>(0);

  constructor() {
    effect(() => {
      const el = this.elementRef.nativeElement;
      el.setAttribute('display', 'grid');
      el.setAttribute('grid-template-columns', String(this.columns()));
      el.setAttribute('gap', String(this.gap()));
      el.setAttribute('padding', String(this.padding()));
      el.setAttribute('flex-shrink', '0');
      this.renderService.scheduleRender();
    });
  }
}
