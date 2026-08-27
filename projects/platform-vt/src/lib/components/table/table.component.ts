import { Component, inject, input, output, signal, effect, ElementRef, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { RenderService } from '../../services/render.service';
import { InputService } from '../../services/input.service';
import { FocusService } from '../../services/focus.service';
import { ClickService } from '../../services/click.service';
import { STYLE_READER, type VTStyleReader } from '../../styles/style-registry';

let nextId = 0;

/** Sort direction for {@link TableComponent}. */
export type TableSortDirection = 'asc' | 'desc';

/** The currently applied sort. */
export interface TableSort {
  /** Column index. */
  column: number;
  direction: TableSortDirection;
}

/**
 * A bordered data table with sorting, row selection and row virtualization.
 *
 * - **Sorting**: click a header cell (or focus the table and press
 *   `left`/`right` + `return`) to sort by that column; the header shows an
 *   arrow (`▲`/`▼`). `sortChange` emits the new sort.
 * - **Selection**: `up`/`down` move the selected row; `selectedChange`
 *   emits its index; the selected row is highlighted.
 * - **Virtualization**: only `viewportRows` rows are rendered; `up`/`down`
 *   scroll the window over large datasets.
 *
 * @example
 * ```html
 * <vt-table
 *   [columns]="['Name', 'Size']"
 *   [rows]="items()"
 *   [sortable]="true"
 *   (sortChange)="applySort($event)"
 *   (selectedChange)="onSelect($event)"
 * ></vt-table>
 * ```
 */
@Component({
  selector: 'vt-table',
  template: '',
})
export class TableComponent {
  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly renderService = inject(RenderService);
  private readonly inputService = inject(InputService);
  private readonly focusService = inject(FocusService);
  private readonly clickService = inject(ClickService);
  private readonly styleReader = inject(STYLE_READER) as VTStyleReader;
  private readonly destroyRef = inject(DestroyRef);

  readonly columns = input.required<string[]>();
  readonly rows = input.required<string[][]>();
  readonly border = input<boolean>(true);
  /** Whether header clicks/keys sort the table. */
  readonly sortable = input<boolean>(false);
  /** Currently applied sort. */
  readonly sort = input<TableSort | null>(null);
  /** Number of rows rendered at once (virtualization window). */
  readonly viewportRows = input<number>(10);
  /** Whether rows can be selected with the keyboard. */
  readonly selectable = input<boolean>(true);

  readonly sortChange = output<TableSort | null>();
  /** Emits the selected row index (or -1 when none). */
  readonly selectedChange = output<number>();

  /** Index of the first visible row (scroll offset). */
  readonly scrollOffset = signal(0);
  /** Currently selected row index (or -1). */
  readonly selectedRow = signal(-1);
  readonly isFocused = signal(false);

  private readonly id = `vt-table-${String(nextId++)}`;

  constructor() {
    effect(() => {
      const focused = this.focusService.focused();
      this.isFocused.set(focused?.id === this.id);
    });

    effect(() => {
      const el = this.elementRef.nativeElement as HTMLElement;
      const cols = this.columns();
      const allRows = this.rows();
      const sort = this.sort();
      const viewport = Math.max(1, this.viewportRows());

      const sorted = sort ? this.sortRows(allRows, sort) : allRows;
      const offset = Math.min(this.scrollOffset(), Math.max(0, sorted.length - viewport));
      this.scrollOffset.set(offset);
      const data = sorted.slice(offset, offset + viewport);

      const colWidths = cols.map((col, i) => {
        const maxData = Math.max(...data.map((r) => (r[i] ?? '').length));
        const header = sort?.column === i ? `${col} ${sort.direction === 'asc' ? '\u25B2' : '\u25BC'}` : col;
        return Math.max(header.length, maxData) + 2;
      });
      const hSep = '\u2500'.repeat(colWidths.reduce((a, b) => a + b + 3, -1));
      const showBorder = this.border();
      const themed = this.styleReader.get('vt-table')['color'] ?? '';

      el.setAttribute('display', 'flex');
      el.setAttribute('flex-direction', 'column');
      el.setAttribute('flex-shrink', '0');
      el.setAttribute('min-height', '1');

      const lines: string[] = [];
      if (showBorder) lines.push('\u250C' + hSep + '\u2510');
      const header = cols
        .map((col, i) => {
          const text = sort?.column === i ? `${col} ${sort.direction === 'asc' ? '\u25B2' : '\u25BC'}` : col;
          return ' ' + text.padEnd(colWidths[i]! - 1);
        })
        .join('\u2502');
      lines.push((showBorder ? '\u2502 ' : '') + header + (showBorder ? ' \u2502' : ''));
      if (showBorder) lines.push('\u251C' + hSep + '\u2524');
      for (let ri = 0; ri < data.length; ri++) {
        const row = data[ri]!.map((cell, i) => {
          const w = colWidths[i] ?? 0;
          return ' ' + cell.padEnd(w - 1);
        });
        lines.push((showBorder ? '\u2502 ' : '') + row.join('\u2502') + (showBorder ? ' \u2502' : ''));
      }
      if (showBorder) lines.push('\u2514' + hSep + '\u2518');

      // Render each line as its own span so selected rows can use reverse
      // video without embedding raw ANSI in textContent.
      while (el.children.length < lines.length) {
        const span = document.createElement('vt-table-line');
        span.setAttribute('display', 'block');
        span.setAttribute('flex-shrink', '0');
        el.appendChild(span);
      }
      while (el.children.length > lines.length) {
        el.lastElementChild?.remove();
      }

      const selected = this.selectedRow();
      const headerLines = (showBorder ? 2 : 1);
      for (let i = 0; i < lines.length; i++) {
        const span = el.children[i] as HTMLElement;
        span.textContent = lines[i]!;
        span.setAttribute('content', lines[i]!);
        if (i >= headerLines && this.selectable() && selected >= 0 && selected - offset === i - headerLines) {
          span.setAttribute('inverse', 'true');
          span.setAttribute('color', 'bright-white');
        } else {
          span.removeAttribute('inverse');
          span.setAttribute('color', String(themed));
        }
      }
      this.renderService.scheduleRender();
    });

    this.focusService.register({
      id: this.id,
      element: this.elementRef.nativeElement,
      priority: 1,
      onFocus: () => {
        this.isFocused.set(true);
        this.renderService.scheduleRender();
      },
      onBlur: () => {
        this.isFocused.set(false);
        this.renderService.scheduleRender();
      },
    });

    this.clickService.register({
      id: this.id,
      element: this.elementRef.nativeElement as HTMLElement,
      onClick: (event, node) => {
        const rowIndex = event.y - node.y - 2; // header + separator
        const colIndex = this.columnAt(event.x - node.x);
        if (rowIndex < 0 && this.sortable() && colIndex >= 0) {
          this.toggleSort(colIndex);
        } else if (rowIndex >= 0 && this.selectable()) {
          this.selectedRow.set(this.scrollOffset() + rowIndex);
          this.selectedChange.emit(this.selectedRow());
        }
        this.focusService.focus(this.id);
        this.renderService.scheduleRender();
      },
    });

    this.inputService.keyEvents
      .pipe(
        filter(() => this.isFocused()),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((event) => {
        const rows = this.rows();
        const viewport = Math.max(1, this.viewportRows());
        const selected = this.selectedRow();
        switch (event.name) {
          case 'down':
            if (selected < rows.length - 1) {
              const next = selected + 1;
              this.selectedRow.set(next);
              if (next >= this.scrollOffset() + viewport) {
                this.scrollOffset.set(next - viewport + 1);
              }
              this.selectedChange.emit(next);
            }
            break;
          case 'up':
            if (selected > 0) {
              const next = selected - 1;
              this.selectedRow.set(next);
              if (next < this.scrollOffset()) {
                this.scrollOffset.set(next);
              }
              this.selectedChange.emit(next);
            }
            break;
          case 'left':
            if (this.sortable()) {
              const col = Math.max(0, (this.sort()?.column ?? 0) - 1);
              this.toggleSort(col);
            }
            break;
          case 'right':
            if (this.sortable()) {
              const col = Math.min(this.columns().length - 1, (this.sort()?.column ?? -1) + 1);
              this.toggleSort(col);
            }
            break;
          case 'return':
            if (selected >= 0) this.selectedChange.emit(selected);
            break;
        }
        this.renderService.scheduleRender();
      });

    this.destroyRef.onDestroy(() => {
      this.clickService.unregister(this.id);
      this.focusService.unregister(this.id);
    });
  }

  private sortRows(rows: string[][], sort: TableSort): string[][] {
    const { column, direction } = sort;
    const copy = rows.slice();
    copy.sort((a, b) => {
      const av = a[column] ?? '';
      const bv = b[column] ?? '';
      const an = Number(av);
      const bn = Number(bv);
      let cmp: number;
      if (av.trim() !== '' && Number.isFinite(an) && bv.trim() !== '' && Number.isFinite(bn)) {
        cmp = an - bn;
      } else {
        cmp = av.localeCompare(bv);
      }
      return direction === 'asc' ? cmp : -cmp;
    });
    return copy;
  }

  private toggleSort(column: number): void {
    const current = this.sort();
    let next: TableSort | null;
    if (current?.column === column) {
      next = current.direction === 'asc' ? { column, direction: 'desc' } : null;
    } else {
      next = { column, direction: 'asc' };
    }
    this.sortChange.emit(next);
    this.scrollOffset.set(0);
    this.renderService.scheduleRender();
  }

  private columnAt(x: number): number {
    const widths = this.columns().map((col, i) => {
      const data = this.rows();
      const maxData = Math.max(...data.map((r) => (r[i] ?? '').length));
      return Math.max(col.length, maxData) + 2;
    });
    let offset = 1;
    for (let i = 0; i < widths.length; i++) {
      if (x >= offset && x < offset + widths[i]!) return i;
      offset += widths[i]! + 1;
    }
    return -1;
  }

  focus(): void {
    this.focusService.focus(this.id);
  }
}