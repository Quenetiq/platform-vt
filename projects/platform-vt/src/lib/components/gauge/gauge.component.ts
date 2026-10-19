import { Component, ElementRef, computed, effect, inject, input } from '@angular/core';
import { RenderService } from '../../services/render.service';
import { STYLE_READER, type VTStyleReader } from '../../styles/style-registry';
import { setStyleAttr } from '../../cdk/dom';

/**
 * A horizontal gauge / progress meter with a label and percentage.
 *
 * Unlike {@link ProgressComponent}, a gauge is value-scale aware (`min`/
 * `max`), can show its numeric value, and renders as a single compact line.
 *
 * @example
 * ```html
 * <vt-gauge label="CPU" [value]="73" [max]="100" [width]="20"></vt-gauge>
 * ```
 */
@Component({
  selector: 'vt-gauge',
  template: '',
})
export class GaugeComponent {
  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly renderService = inject(RenderService);
  private readonly styleReader = inject(STYLE_READER) as VTStyleReader;

  /** Current value. */
  readonly value = input<number>(0);
  /** Scale minimum. */
  readonly min = input<number>(0);
  /** Scale maximum. */
  readonly max = input<number>(100);
  /** Bar width in cells. */
  readonly width = input<number>(20);
  /** Optional label printed before the bar. */
  readonly label = input<string>('');
  /** Show the numeric percentage after the bar. */
  readonly showValue = input<boolean>(true);
  /** Bar color. */
  readonly color = input<string>('cyan');
  /** Character used for the filled portion. */
  readonly filledGlyph = input<string>('\u2588');
  /** Character used for the empty portion. */
  readonly emptyGlyph = input<string>('\u2591');

  /** Normalized value in the 0-100 range. */
  readonly percent = computed(() => {
    const min = this.min();
    const max = this.max();
    const span = max - min;
    if (span <= 0) return 0;
    return Math.max(0, Math.min(100, ((this.value() - min) / span) * 100));
  });

  constructor() {
    effect(() => {
      const el = this.elementRef.nativeElement;
      const width = Math.max(1, this.width());
      const percent = this.percent();
      const filled = Math.round((percent / 100) * width);
      const bar = this.filledGlyph().repeat(filled) + this.emptyGlyph().repeat(width - filled);
      const label = this.label().length > 0 ? `${this.label()} ` : '';
      const value = this.showValue() ? ` ${String(Math.round(percent))}%` : '';
      const text = `${label}${bar}${value}`;

      el.setAttribute('display', 'flex');
      el.setAttribute('flex-direction', 'row');
      el.setAttribute('flex-shrink', '0');
      el.setAttribute('min-height', '1');
      el.setAttribute('content', text);
      el.textContent = text;
      const color = this.color() || String(this.styleReader.get('vt-gauge')['color'] ?? '');
      setStyleAttr(el, 'color', color);
      this.renderService.scheduleRender();
    });
  }
}
