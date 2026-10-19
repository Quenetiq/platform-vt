import { Component, ElementRef, computed, effect, inject, input } from '@angular/core';
import { RenderService } from '../../services/render.service';

/** Default heatmap palette, from low to high. */
export const HEATMAP_PALETTE = ['gray', 'blue', 'cyan', 'green', 'yellow', 'red'];

/**
 * A matrix heatmap with optional row/column labels.
 *
 * Every value is normalized between `min`/`max` (auto-detected when omitted)
 * and mapped to a color from `palette`. Cells render as colored block glyphs;
 * `cellWidth` repeats the glyph for wider cells.
 *
 * @example
 * ```html
 * <vt-heatmap
 *   [data]="[[1, 2, 3], [4, 5, 6]]"
 *   [rowLabels]="['Mon', 'Tue']"
 *   [columnLabels]="['00', '06', '12']"
 * ></vt-heatmap>
 * ```
 */
@Component({
  selector: 'vt-heatmap',
  template: '',
})
export class HeatmapComponent {
  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly renderService = inject(RenderService);

  /** Matrix values, one array per row. */
  readonly data = input<number[][]>([]);
  /** Optional labels printed to the left of each row. */
  readonly rowLabels = input<string[]>([]);
  /** Optional labels printed above the columns. */
  readonly columnLabels = input<string[]>([]);
  /** Scale minimum (auto-detected when null). */
  readonly min = input<number | null>(null);
  /** Scale maximum (auto-detected when null). */
  readonly max = input<number | null>(null);
  /** Colors from low to high. */
  readonly palette = input<string[]>(HEATMAP_PALETTE);
  /** Number of glyphs per cell. */
  readonly cellWidth = input<number>(1);
  /** Character used for each cell. */
  readonly glyph = input<string>('\u2588');

  /** Row label column width (0 when there are no labels). */
  readonly labelWidth = computed(() =>
    this.rowLabels().reduce((max, label) => Math.max(max, label.length), 0),
  );

  constructor() {
    effect(() => {
      const el = this.elementRef.nativeElement;
      const data = this.data();
      const rows = this.rowLabels();
      const columns = this.columnLabels();
      const palette = this.palette().length > 0 ? this.palette() : HEATMAP_PALETTE;
      const cellWidth = Math.max(1, this.cellWidth());
      const labelWidth = this.labelWidth();
      const glyph = this.glyph() || '\u2588';

      el.setAttribute('display', 'flex');
      el.setAttribute('flex-direction', 'column');
      el.setAttribute('flex-shrink', '0');
      el.replaceChildren();

      if (columns.length > 0) {
        const header = this.row('vt-heatmap-labels');
        if (labelWidth > 0) {
          header.appendChild(this.labelElement(''.padEnd(labelWidth), labelWidth));
        }
        for (const label of columns) {
          header.appendChild(this.labelElement(this.fit(label, cellWidth), cellWidth));
        }
        el.appendChild(header);
      }

      const { min, max } = this.bounds(data);
      for (let r = 0; r < data.length; r++) {
        const rowEl = this.row('vt-heatmap-row');
        if (labelWidth > 0) {
          const label = rows[r] ?? '';
          rowEl.appendChild(this.labelElement(label.padEnd(labelWidth), labelWidth));
        }
        const values = data[r] ?? [];
        for (const value of values) {
          const bucket = this.bucket(value, min, max, palette.length);
          const cell = document.createElement('vt-heatmap-cell');
          cell.setAttribute('display', 'flex');
          cell.setAttribute('flex-direction', 'row');
          cell.setAttribute('flex-shrink', '0');
          cell.setAttribute('min-height', '1');
          cell.setAttribute('color', palette[bucket] ?? palette[0]!);
          const text = glyph.repeat(cellWidth);
          cell.setAttribute('content', text);
          cell.textContent = text;
          rowEl.appendChild(cell);
        }
        el.appendChild(rowEl);
      }

      this.renderService.scheduleRender();
    });
  }

  private bounds(data: number[][]): { min: number; max: number } {
    const explicitMin = this.min();
    const explicitMax = this.max();
    const values = data.flat().filter((value) => Number.isFinite(value));
    const min = explicitMin ?? (values.length > 0 ? Math.min(...values) : 0);
    let max = explicitMax ?? (values.length > 0 ? Math.max(...values) : 1);
    if (max <= min) max = min + 1;
    return { min, max };
  }

  private bucket(value: number, min: number, max: number, buckets: number): number {
    if (buckets <= 1) return 0;
    const normalized = (value - min) / (max - min);
    const index = Math.floor(normalized * buckets);
    return Math.max(0, Math.min(buckets - 1, index));
  }

  private row(tag: string): HTMLElement {
    const row = document.createElement(tag);
    row.setAttribute('display', 'flex');
    row.setAttribute('flex-direction', 'row');
    row.setAttribute('flex-shrink', '0');
    row.setAttribute('min-height', '1');
    return row;
  }

  private labelElement(text: string, width: number): HTMLElement {
    const label = document.createElement('vt-heatmap-label');
    label.setAttribute('display', 'flex');
    label.setAttribute('flex-direction', 'row');
    label.setAttribute('flex-shrink', '0');
    label.setAttribute('min-height', '1');
    label.setAttribute('width', String(width));
    label.setAttribute('color', 'gray');
    label.setAttribute('content', text);
    label.textContent = text;
    return label;
  }

  private fit(text: string, width: number): string {
    if (text.length <= width) return text.padEnd(width);
    if (width <= 1) return '\u2026';
    return text.slice(0, width - 1) + '\u2026';
  }
}
