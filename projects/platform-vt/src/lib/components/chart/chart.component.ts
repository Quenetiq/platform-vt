import { Component, effect, ElementRef, inject, input } from '@angular/core';
import { RenderService } from '../../services/render.service';
import { LINE_ATTRS, setCellText, syncChildren } from '../../cdk/dom';

/** Chart kind. */
export type ChartKind = 'line' | 'bar';

/** Minimum chart height. */
const MIN_ROWS = 3;

/** Width reserved for the value scale on the left. */
const SCALE_WIDTH = 5;

/**
 * A value chart with axes and labels.
 *
 * - **bar**: one column per value, filled from the bottom.
 * - **line**: points (`•`) connected with horizontal segments (`─`) where
 *   adjacent values share a row.
 *
 * The value scale is printed on the left (max at the top, min at the
 * bottom) and the optional `labels` on the bottom row. Values are scaled
 * linearly between `min`/`max` (auto-detected when omitted).
 *
 * @example
 * ```html
 * <vt-chart [data]="[3, 8, 5, 9, 2]" [labels]="['Mon','Tue']" [kind]="'bar'"></vt-chart>
 * ```
 */
@Component({
  selector: 'vt-chart',
  template: '',
})
export class ChartComponent {
  /** Values to plot (one per column). */
  readonly data = input.required<number[]>();
  /** Optional labels printed on the bottom axis. */
  readonly labels = input<string[]>([]);
  /** Chart height in rows (excluding the label row). */
  readonly height = input<number>(8);
  /** Explicit scale bounds; auto-detected when null. */
  readonly min = input<number | null>(null);
  readonly max = input<number | null>(null);
  /** 'line' (default) or 'bar'. */
  readonly kind = input<ChartKind>('line');
  /** Color of the plotted data. */
  readonly color = input<string>('cyan');
  /** Color of the axes and scale. */
  readonly axisColor = input<string>('gray');

  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly renderService = inject(RenderService);

  constructor() {
    effect(() => {
      const el = this.elementRef.nativeElement as HTMLElement;
      const data = this.data();
      const labels = this.labels();
      const rows = Math.max(MIN_ROWS, this.height());
      const kind = this.kind();
      const color = this.color();
      const axisColor = this.axisColor();
      const values = data.length > 0 ? data : [0];
      const max = this.max() ?? Math.max(...values, 1);
      const min = this.min() ?? Math.min(...values, 0);
      const range = Math.max(1, max - min);
      const chartWidth = values.length;

      el.setAttribute('display', 'flex');
      el.setAttribute('flex-direction', 'column');
      el.setAttribute('flex-shrink', '0');

      const lineCount = rows + (labels.length > 0 ? 1 : 0);
      const lines = syncChildren(el, lineCount, 'vt-chart-line', LINE_ATTRS);

      const plot = (value: number): number =>
        rows - 1 - Math.round(((value - min) / range) * (rows - 1));

      for (let y = 0; y < lineCount; y++) {
        const row = lines[y]!;
        const isLabelRow = labels.length > 0 && y === rows;
        const isPlotRow = !isLabelRow && y < rows;
        const scale = isPlotRow
          ? y === 0
            ? String(max)
            : y === rows - 1
              ? String(min)
              : ''
          : '';

        let text = (scale + ' '.repeat(SCALE_WIDTH - scale.length) + ' ') as string;
        if (isLabelRow) {
          const width = Math.max(1, Math.floor(chartWidth / values.length));
          text += labels
            .map((label) => label.substring(0, width).padEnd(width))
            .join('')
            .substring(0, chartWidth);
        } else if (isPlotRow) {
          for (let x = 0; x < values.length; x++) {
            text += this.cellAt(kind, values, plot, x, y);
          }
        }
        setCellText(row, text);
        row.setAttribute('color', isPlotRow ? color : axisColor);
      }
      this.renderService.scheduleRender();
    });
  }

  /** The plot cell at a column/row, or a space. */
  private cellAt(
    kind: ChartKind,
    values: number[],
    plot: (value: number) => number,
    x: number,
    y: number,
  ): string {
    const currentY = plot(values[x]!);
    const next = values[x + 1];
    if (kind === 'bar') {
      return currentY <= y ? '\u2588' : ' ';
    }
    if (currentY === y) {
      // A segment connects this point with the next one on the same row.
      if (next !== undefined && plot(next) === y) return '\u2500';
      return '\u2022';
    }
    return ' ';
  }
}