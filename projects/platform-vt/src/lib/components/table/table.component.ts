import {
  Component,
  computed,
  inject,
  input,
  output,
  signal,
  effect,
  ElementRef,
  DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { RenderService } from '../../services/render.service';
import { InputService } from '../../services/input.service';
import { FocusService } from '../../services/focus.service';
import { ClickService } from '../../services/click.service';
import { STYLE_READER, type VTStyleReader } from '../../styles/style-registry';
import { LINE_ATTRS, setCellText, syncChildren, createIdGenerator } from '../../cdk/dom';

/** Sort direction for {@link TableComponent}. */
export type TableSortDirection = 'asc' | 'desc';

/** The currently applied sort. */
export interface TableSort {
  /** Column index (original, regardless of reordering). */
  column: number;
  direction: TableSortDirection;
}

/** A row together with its original index in the `rows` input. */
interface TableEntry {
  row: string[];
  index: number;
}

/**
 * A bordered data table with sorting, filtering, row selection, column
 * resizing/reordering and row virtualization.
 *
 * - **Sorting**: click a header cell (or press `left`/`right` + `return`) to
 *   sort by that column; the header shows an arrow (`▲`/`▼`).
 * - **Filtering**: `[filter]="text"` keeps rows containing the text in any
 *   cell (case-insensitive).
 * - **Selection**: `up`/`down` move the active row, `page-up`/`page-down`
 *   jump by a viewport, `home`/`end` jump to the first/last row. With
 *   `[multiSelect]="true"`, `space` toggles the active row; `selectionChange`
 *   emits the selected original row indices.
 * - **Columns**: `[resizable]="true"` + `ctrl+←`/`ctrl+→` resize the active
 *   column; `[reorderable]="true"` + `alt+←`/`alt+→` move it. Clicking a
 *   header makes that column active.
 * - **Virtualization**: only `viewportRows` rows are rendered. The header
 *   stays visible unless `[stickyHeader]="false"`.
 *
 * @example
 * ```html
 * <vt-table
 *   [columns]="['Name', 'Size']"
 *   [rows]="items()"
 *   [sortable]="true" [filter]="query()" [multiSelect]="true"
 *   [resizable]="true" [reorderable]="true"
 *   (sortChange)="applySort($event)"
 *   (selectionChange)="onSelect($event)"
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

  /** Case-insensitive filter across all cells. */
  readonly filter = input<string>('');

  /** Allow selecting several rows (`space` toggles). */
  readonly multiSelect = input<boolean>(false);

  /** Allow resizing columns with `ctrl+←`/`ctrl+→`. */
  readonly resizable = input<boolean>(false);

  /** Allow reordering columns with `alt+←`/`alt+→`. */
  readonly reorderable = input<boolean>(false);

  /** Keep the header visible while scrolling (default true). */
  readonly stickyHeader = input<boolean>(true);

  /** Minimum column width (content cells, excluding padding). */
  readonly minColumnWidth = input<number>(3);

  readonly sortChange = output<TableSort | null>();
  /** Emits the active (keyboard) row's original index, or -1 when none. */
  readonly selectedChange = output<number>();
  /** Emits the selected original row indices in multi-select mode. */
  readonly selectionChange = output<number[]>();
  /** Emits after a column is resized. */
  readonly columnWidthsChange = output<number[]>();
  /** Emits the new column order (original indices) after a reorder. */
  readonly columnOrderChange = output<number[]>();

  /** Index of the first visible row (scroll offset within filtered rows). */
  readonly scrollOffset = signal(0);
  /** Active row's original index (or -1). */
  readonly selectedRow = signal(-1);
  /** Selected original row indices (multi-select). */
  readonly selectedRows = signal<number[]>([]);
  /** Column being edited by resize/reorder keys (original index). */
  readonly activeColumn = signal(0);
  /** Explicit column widths (original index → total width including padding). */
  readonly columnWidths = signal<Record<number, number>>({});
  /** Explicit column order (original indices). */
  readonly columnOrder = signal<number[]>([]);
  readonly isFocused = signal(false);

  private readonly id = createIdGenerator('vt-table')();

  /** Rows after filtering and sorting, with original indices. */
  private readonly visibleEntries = computed<TableEntry[]>(() => {
    const needle = this.filter().trim().toLowerCase();
    const entries = this.rows()
      .map((row, index) => ({ row, index }))
      .filter(
        (entry) => needle.length === 0 || entry.row.some((cell) => cell.toLowerCase().includes(needle)),
      );
    const sort = this.sort();
    return sort ? this.sortEntries(entries, sort) : entries;
  });

  /** Effective column order (original indices). */
  readonly effectiveOrder = computed<number[]>(() => {
    const count = this.columns().length;
    const order = this.columnOrder().filter((index) => index >= 0 && index < count);
    for (let i = 0; i < count; i++) {
      if (!order.includes(i)) order.push(i);
    }
    return order;
  });

  constructor() {
    effect(() => {
      const focused = this.focusService.focused();
      this.isFocused.set(focused?.id === this.id);
    });

    effect(() => {
      const el = this.elementRef.nativeElement as HTMLElement;
      const cols = this.columns();
      const order = this.effectiveOrder();
      const entries = this.visibleEntries();
      const sort = this.sort();
      const viewport = Math.max(1, this.viewportRows());
      const widths = this.columnWidths();
      const sticky = this.stickyHeader();

      const offset = Math.min(this.scrollOffset(), Math.max(0, entries.length - viewport));
      this.scrollOffset.set(offset);
      const data = entries.slice(offset, offset + viewport);

      // Widths are computed from ALL rows so the header, the visible rows
      // and the borders stay aligned while scrolling or re-sorting.
      const colWidths = order.map((column) =>
        this.columnWidth(
          column,
          this.headerText(column, cols[column] ?? '', sort),
          entries,
          widths[column],
        ),
      );
      const hSep = '\u2500'.repeat(colWidths.reduce((a, b) => a + b + 3, -1));
      const showBorder = this.border();
      const themed = this.styleReader.get('vt-table')['color'] ?? '';
      const showHeader = sticky || offset === 0;

      el.setAttribute('display', 'flex');
      el.setAttribute('flex-direction', 'column');
      el.setAttribute('flex-shrink', '0');
      el.setAttribute('min-height', '1');

      const lines: string[] = [];
      if (showBorder) lines.push('\u250C' + hSep + '\u2510');
      let headerLines = 0;
      if (showHeader) {
        const header = order
          .map((column, i) => {
            const text = this.headerText(column, cols[column] ?? '', sort);
            return ' ' + this.fit(text, colWidths[i]! - 1);
          })
          .join('\u2502');
        lines.push((showBorder ? '\u2502 ' : '') + header + (showBorder ? ' \u2502' : ''));
        if (showBorder) lines.push('\u251C' + hSep + '\u2524');
        headerLines = showBorder ? 2 : 1;
      }
      for (const entry of data) {
        const row = order.map((column, i) => {
          const w = colWidths[i] ?? 0;
          return ' ' + this.fit(entry.row[column] ?? '', w - 1).padEnd(w - 1);
        });
        lines.push(
          (showBorder ? '\u2502 ' : '') + row.join('\u2502') + (showBorder ? ' \u2502' : ''),
        );
      }
      if (showBorder) lines.push('\u2514' + hSep + '\u2518');

      // Render each line as its own span so selected rows can use reverse
      // video without embedding raw ANSI in textContent.
      const spans = syncChildren(el, lines.length, 'vt-table-line', LINE_ATTRS);

      const selected = this.selectedRow();
      const multiSelected = this.selectedRows();
      for (let i = 0; i < lines.length; i++) {
        const span = spans[i]!;
        setCellText(span, lines[i]!);
        const entry = i >= headerLines ? data[i - headerLines] : undefined;
        const highlighted =
          entry !== undefined &&
          this.selectable() &&
          (this.multiSelect()
            ? multiSelected.includes(entry.index)
            : selected === entry.index);
        if (highlighted) {
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
        const headerLines = this.headerLines();
        const dataRow = event.y - node.y - headerLines; // may be negative over the header
        const colIndex = this.columnAt(event.x - node.x);
        if (dataRow < 0 && colIndex >= 0) {
          this.activeColumn.set(colIndex);
          if (this.sortable()) this.toggleSort(colIndex);
        } else if (dataRow >= 0 && this.selectable()) {
          const entry = this.visibleEntries()[this.scrollOffset() + dataRow];
          if (entry) {
            this.selectedRow.set(entry.index);
            this.selectedChange.emit(entry.index);
            if (this.multiSelect()) {
              if (event.ctrl) this.toggleRow(entry.index);
              else this.selectedRows.set([entry.index]);
              this.selectionChange.emit(this.selectedRows());
            }
          }
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
        const entries = this.visibleEntries();
        const viewport = Math.max(1, this.viewportRows());
        const selected = this.selectedRow();
        const position = entries.findIndex((entry) => entry.index === selected);

        switch (event.name) {
          case 'down': {
            const next = Math.min(entries.length - 1, position + 1);
            this.selectPosition(next);
            break;
          }
          case 'up': {
            if (position <= 0) break;
            this.selectPosition(position - 1);
            break;
          }
          case 'left':
            if (event.ctrl || event.meta) {
              if (event.meta) this.moveActiveColumn(-1);
              else this.resizeActiveColumn(-1);
            } else if (this.sortable()) {
              const col = Math.max(0, (this.sort()?.column ?? this.activeColumn()) - 1);
              this.toggleSort(col);
            }
            break;
          case 'right':
            if (event.ctrl || event.meta) {
              if (event.meta) this.moveActiveColumn(1);
              else this.resizeActiveColumn(1);
            } else if (this.sortable()) {
              const col = Math.min(this.columns().length - 1, (this.sort()?.column ?? -1) + 1);
              this.toggleSort(col);
            }
            break;
          case 'page-down':
            this.selectPosition(Math.min(entries.length - 1, position + viewport));
            break;
          case 'page-up':
            if (position <= 0) break;
            this.selectPosition(position - viewport);
            break;
          case 'home':
            this.selectPosition(0);
            break;
          case 'end':
            this.selectPosition(entries.length - 1);
            break;
          case ' ':
            if (this.multiSelect() && selected >= 0) {
              this.toggleRow(selected);
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

  /** Set a column's total width (content + padding). */
  setColumnWidth(column: number, width: number): void {
    const total = Math.max(this.minColumnWidth() + 2, Math.round(width));
    this.columnWidths.update((widths) => ({ ...widths, [column]: total }));
    this.columnWidthsChange.emit(this.widthList());
    this.renderService.scheduleRender();
  }

  /** Move a column to a new position in the display order. */
  moveColumn(column: number, target: number): void {
    const order = [...this.effectiveOrder()];
    const from = order.indexOf(column);
    if (from < 0) return;
    const to = Math.max(0, Math.min(order.length - 1, target));
    if (from === to) return;
    order.splice(from, 1);
    order.splice(to, 0, column);
    this.columnOrder.set(order);
    this.columnOrderChange.emit(order);
    this.renderService.scheduleRender();
  }

  /** Current effective column widths indexed by original column. */
  widthList(): number[] {
    const entries = this.visibleEntries();
    const overrides = this.columnWidths();
    return this.columns().map((label, index) =>
      this.columnWidth(
        index,
        this.headerText(index, label, this.sort()),
        entries,
        overrides[index],
      ),
    );
  }

  focus(): void {
    this.focusService.focus(this.id);
  }

  private selectPosition(position: number): void {
    const entries = this.visibleEntries();
    if (entries.length === 0) return;
    const clamped = Math.max(0, Math.min(entries.length - 1, position));
    const entry = entries[clamped]!;
    this.selectedRow.set(entry.index);
    const viewport = Math.max(1, this.viewportRows());
    if (clamped < this.scrollOffset()) this.scrollOffset.set(clamped);
    else if (clamped >= this.scrollOffset() + viewport) {
      this.scrollOffset.set(clamped - viewport + 1);
    }
    this.selectedChange.emit(entry.index);
  }

  private toggleRow(index: number): void {
    this.selectedRows.update((rows) =>
      rows.includes(index) ? rows.filter((row) => row !== index) : [...rows, index].sort((a, b) => a - b),
    );
    this.selectionChange.emit(this.selectedRows());
    this.renderService.scheduleRender();
  }

  private resizeActiveColumn(delta: number): void {
    if (!this.resizable()) return;
    const column = this.activeColumn();
    const header = this.headerText(column, this.columns()[column] ?? '', this.sort());
    const width = this.columnWidth(
      column,
      header,
      this.visibleEntries(),
      this.columnWidths()[column],
    );
    this.setColumnWidth(column, width + delta);
  }

  private moveActiveColumn(delta: number): void {
    if (!this.reorderable()) return;
    const order = this.effectiveOrder();
    const position = order.indexOf(this.activeColumn());
    if (position < 0) return;
    this.moveColumn(this.activeColumn(), position + delta);
  }

  private sortEntries(entries: TableEntry[], sort: TableSort): TableEntry[] {
    const { column, direction } = sort;
    return entries.slice().sort((a, b) => {
      const av = a.row[column] ?? '';
      const bv = b.row[column] ?? '';
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
  }

  private toggleSort(column: number): void {
    const current = this.sort();
    let next: TableSort | null;
    if (current?.column === column) {
      next = current.direction === 'asc' ? { column, direction: 'desc' } : null;
    } else {
      next = { column, direction: 'asc' };
    }
    this.activeColumn.set(column);
    this.sortChange.emit(next);
    this.scrollOffset.set(0);
    this.renderService.scheduleRender();
  }

  private columnAt(x: number): number {
    const order = this.effectiveOrder();
    const widths = this.columnWidths();
    const entries = this.visibleEntries();
    let offset = this.border() ? 1 : 0;
    for (const column of order) {
      const width = this.columnWidth(
        column,
        this.headerText(column, this.columns()[column] ?? '', this.sort()),
        entries,
        widths[column],
      );
      if (x >= offset && x < offset + width) return column;
      offset += width + 1;
    }
    return -1;
  }

  private columnWidth(
    column: number,
    header: string,
    entries: TableEntry[],
    override: number | undefined,
  ): number {
    if (override !== undefined) {
      return Math.max(this.minColumnWidth() + 2, override);
    }
    const maxData = entries.reduce(
      (max, entry) => Math.max(max, (entry.row[column] ?? '').length),
      0,
    );
    return Math.max(header.length, maxData) + 2;
  }

  private headerText(column: number, label: string, sort: TableSort | null): string {
    if (sort?.column !== column) return label;
    return `${label} ${sort.direction === 'asc' ? '\u25B2' : '\u25BC'}`;
  }

  private headerLines(): number {
    const showHeader = this.stickyHeader() || this.scrollOffset() === 0;
    if (!showHeader) return 0;
    return this.border() ? 2 : 1;
  }

  private fit(text: string, width: number): string {
    if (width <= 0) return '';
    if (text.length <= width) return text.padEnd(width);
    if (width <= 1) return '\u2026';
    return text.slice(0, width - 1) + '\u2026';
  }
}
