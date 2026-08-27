import { Component, input, inject, effect, ElementRef } from '@angular/core';
import { RenderService } from '../../services/render.service';
import { VtSizingDirective } from '../../directives/sizing.directive';
import { VtAppearanceDirective } from '../../directives/appearance.directive';

/**
 * A compact single-line chart for numeric data: bar or sparkline style.
 *
 * Bar mode maps each value to one of the 8 block glyphs `▁▂▃▄▅▆▇█`.
 * Line mode maps the value band of each column onto a braille cell
 * (`. . .` through `⣿`), producing a continuous curve.
 *
 * @example
 * ```html
 * <vt-sparkline [data]="[3, 7, 2, 9, 5, 8, 6]" type="bar" [width]="20"></vt-sparkline>
 * ```
 */
@Component({
  selector: 'vt-sparkline',
  template: '',
  hostDirectives: [
    { directive: VtSizingDirective, inputs: ['width', 'height'] },
    { directive: VtAppearanceDirective, inputs: ['color', 'backgroundColor'] },
  ],
})
export class SparklineComponent {
  private readonly elementRef = inject(ElementRef);
  private readonly renderService = inject(RenderService);

  /** Numeric values to plot. */
  readonly data = input.required<number[]>();

  /** `'bar'` (block glyphs) or `'line'` (braille sparkline). */
  readonly type = input<'bar' | 'line'>('bar');

  /** Width in columns. Defaults to the data length for bar, `data.length * 2` for line. */
  readonly width = input<number | 'auto'>('auto');

  /** Explicit maximum; defaults to the largest value in the data. */
  readonly max = input<number | null>(null);

  /** Foreground color for the filled part (falls back to the `color` attribute). */
  readonly fillColor = input<string>('');

  constructor() {
    effect(() => {
      const el = this.elementRef.nativeElement as HTMLElement;
      const data = this.data();
      const max = this.max() ?? Math.max(1, ...data);
      const widthInput = this.width();
      const width = widthInput === 'auto' ? (this.type() === 'bar' ? data.length : Math.max(1, data.length - 1) * 2) : widthInput;

      const text =
        this.type() === 'bar' ? this.renderBar(data, max, width) : this.renderLine(data, max, width);

      el.setAttribute('display', 'block');
      el.setAttribute('flex-shrink', '0');
      el.setAttribute('width', String(width));
      el.setAttribute('content', text);
      el.textContent = text;
      if (this.fillColor().length > 0) {
        el.setAttribute('color', this.fillColor());
      }
      this.renderService.scheduleRender();
    });
  }

  private renderBar(data: number[], max: number, width: number): string {
    const GLYPHS = [' ', '\u2581', '\u2582', '\u2583', '\u2584', '\u2585', '\u2586', '\u2587', '\u2588'];
    return data
      .slice(0, width)
      .map((value) => {
        const ratio = max <= 0 ? 0 : Math.min(1, Math.max(0, value / max));
        return GLYPHS[Math.round(ratio * 8)]!;
      })
      .join('');
  }

  private renderLine(data: number[], max: number, width: number): string {
    // Braille dots: bit 0 = top-left, 1 = mid-left, 2 = bottom-left,
    // 3 = top-right, 4 = mid-right, 5 = bottom-right.
    const DOT = [0x01, 0x02, 0x04, 0x08, 0x10, 0x20];
    const BRAILLE_BASE = 0x2800;
    const columns = Math.floor(width / 2);
    const dots: number[] = Array.from({ length: columns }, () => 0);

    for (let col = 0; col < columns; col++) {
      const from = Math.floor((col / columns) * data.length);
      const to = Math.max(from + 1, Math.floor(((col + 1) / columns) * data.length));
      let row: number | null = null;
      for (let i = from; i < to; i++) {
        const value = data[i] ?? 0;
        const ratio = max <= 0 ? 0 : Math.min(1, Math.max(0, value / max));
        const r = Math.floor((1 - ratio) * 3); // 0..3 (top..bottom)
        row = row === null ? r : Math.min(row, r);
      }
      if (row === null) row = 3;
      const offset = col % 2 === 0 ? 0 : 3;
      if (row >= 0 && row < 3) dots[col] |= DOT[offset + row]!;
    }

    return dots.map((dot) => String.fromCodePoint(BRAILLE_BASE + dot)).join('');
  }
}