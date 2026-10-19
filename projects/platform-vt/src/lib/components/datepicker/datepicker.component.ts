import {
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  effect,
  inject,
  input,
  linkedSignal,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { InputService } from '../../services/input.service';
import { FocusService } from '../../services/focus.service';
import { RenderService } from '../../services/render.service';
import { ClickService } from '../../services/click.service';
import { createIdGenerator } from '../../cdk/dom';

/** Month names used by {@link DatePickerComponent}. */
export const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/** Weekday initials (Sunday first). */
export const WEEKDAY_NAMES = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

/** Number of cells in one calendar grid row. */
const CELLS = 7;

/** Width of one day cell in columns. */
const CELL_WIDTH = 3;

/**
 * A month calendar / date picker.
 *
 * `value` is an ISO date string (`YYYY-MM-DD`) or `null`. Arrow keys move the
 * active day, PageUp/PageDown change the month, Home/End jump to the start/end
 * of the month, and Enter selects the active day. Clicking a day selects it.
 *
 * @example
 * ```html
 * <vt-datepicker [value]="date()" (valueChange)="date.set($event)"></vt-datepicker>
 * ```
 */
@Component({
  selector: 'vt-datepicker',
  template: '',
})
export class DatePickerComponent {
  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly renderService = inject(RenderService);
  private readonly inputService = inject(InputService);
  private readonly focusService = inject(FocusService);
  private readonly clickService = inject(ClickService);
  private readonly destroyRef = inject(DestroyRef);

  /** Selected ISO date (`YYYY-MM-DD`) or null. */
  readonly value = input<string | null>(null);
  /** Earliest selectable ISO date. */
  readonly min = input<string | null>(null);
  /** Latest selectable ISO date. */
  readonly max = input<string | null>(null);
  /** First day of the week: 0 = Sunday, 1 = Monday. */
  readonly firstDayOfWeek = input<0 | 1>(1);
  /** Focus the calendar on mount. */
  readonly autofocus = input<boolean>(false);
  /** Custom month names. */
  readonly monthNames = input<string[]>(MONTH_NAMES);
  /** Custom weekday initials (Sunday first). */
  readonly weekdayNames = input<string[]>(WEEKDAY_NAMES);

  /** Emits the selected ISO date. */
  readonly valueChange = output<string>();

  /** Active cursor date (drives the displayed month). */
  readonly active = linkedSignal(() => parseIsoDate(this.value()) ?? startOfDay(new Date()));
  /** Currently selected date. */
  readonly selected = linkedSignal(() => parseIsoDate(this.value()));
  readonly isFocused = signal(false);

  private readonly id = createIdGenerator('vt-datepicker')();

  constructor() {
    effect(() => {
      const focused = this.focusService.focused();
      this.isFocused.set(focused?.id === this.id);
    });

    effect(() => {
      const el = this.elementRef.nativeElement;
      const active = this.active();
      const selected = this.selected();
      const min = parseIsoDate(this.min());
      const max = parseIsoDate(this.max());
      const firstDay = this.firstDayOfWeek();
      const months = this.monthNames();
      const weekdays = this.weekdayNames();

      el.setAttribute('display', 'flex');
      el.setAttribute('flex-direction', 'column');
      el.setAttribute('flex-shrink', '0');
      el.setAttribute('width', String(CELLS * CELL_WIDTH));
      el.replaceChildren();

      // Header row: ‹ Month Year ›
      const header = document.createElement('vt-date-header');
      header.setAttribute('display', 'flex');
      header.setAttribute('flex-shrink', '0');
      header.setAttribute('min-height', '1');
      if (this.isFocused()) header.setAttribute('color', 'cyan');
      else header.removeAttribute('color');
      const monthName = months[active.getMonth()] ?? '';
      const headerText = `${'\u2039'} ${monthName} ${String(active.getFullYear())} ${'\u203A'}`;
      header.setAttribute('content', headerText);
      header.textContent = headerText;
      el.appendChild(header);

      // Weekday initials, rotated to match firstDayOfWeek.
      const weekdayRow = this.row('vt-date-weekdays');
      for (let i = 0; i < CELLS; i++) {
        const label = weekdays[(firstDay + i) % 7] ?? '';
        weekdayRow.appendChild(this.cell(label.padEnd(CELL_WIDTH - 1).slice(0, CELL_WIDTH), 'gray'));
      }
      el.appendChild(weekdayRow);

      const year = active.getFullYear();
      const month = active.getMonth();
      const offset = (new Date(year, month, 1).getDay() - firstDay + 7) % 7;
      const days = daysInMonth(year, month);
      const today = startOfDay(new Date());

      let day = 1;
      for (let week = 0; week < 6; week++) {
        const row = this.row('vt-date-week');
        for (let column = 0; column < CELLS; column++) {
          const index = week * CELLS + column;
          if (index < offset || day > days) {
            row.appendChild(this.cell(' '.repeat(CELL_WIDTH), ''));
            continue;
          }
          const date = new Date(year, month, day);
          const inRange =
            (!min || date.getTime() >= min.getTime()) && (!max || date.getTime() <= max.getTime());
          const isActive = sameDay(date, active);
          const isSelected = selected !== null && sameDay(date, selected);
          const isToday = sameDay(date, today);

          const cell = this.cell(
            `${String(day).padStart(2, ' ')} `,
            isSelected ? 'bright-cyan' : inRange ? '' : 'gray',
          );
          if (isActive && this.isFocused()) cell.setAttribute('inverse', 'true');
          if (isSelected) cell.setAttribute('font-weight', 'bold');
          if (isToday) cell.setAttribute('text-decoration', 'underline');
          row.appendChild(cell);
          day++;
        }
        el.appendChild(row);
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
      element: this.elementRef.nativeElement,
      onClick: (event, node) => {
        this.focusService.focus(this.id);
        const row = event.y - node.y;
        const column = Math.floor((event.x - node.x) / CELL_WIDTH);
        if (row === 0) {
          const monthName = this.monthNames()[this.active().getMonth()] ?? '';
          const headerLength = `${'\u2039'} ${monthName} ${String(
            this.active().getFullYear(),
          )} ${'\u203A'}`.length;
          if (column < 1) this.shiftMonth(-1);
          else if (event.x - node.x >= headerLength - 1) this.shiftMonth(1);
          return;
        }
        if (row < 2 || column < 0 || column >= CELLS) return;

        const active = this.active();
        const firstDay = this.firstDayOfWeek();
        const offset = (new Date(active.getFullYear(), active.getMonth(), 1).getDay() - firstDay + 7) % 7;
        const index = (row - 2) * CELLS + column;
        const day = index - offset + 1;
        if (day < 1 || day > daysInMonth(active.getFullYear(), active.getMonth())) return;
        this.moveTo(new Date(active.getFullYear(), active.getMonth(), day));
        this.selectActive();
      },
    });

    const ref = afterNextRender(() => {
      ref.destroy();
      if (this.autofocus()) this.focusService.focus(this.id);
    });

    this.inputService.keyEvents
      .pipe(
        filter(() => this.isFocused()),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((event) => {
        const active = this.active();
        switch (event.name) {
          case 'left':
            this.moveTo(addDays(active, -1));
            break;
          case 'right':
            this.moveTo(addDays(active, 1));
            break;
          case 'up':
            this.moveTo(addDays(active, -7));
            break;
          case 'down':
            this.moveTo(addDays(active, 7));
            break;
          case 'page-up':
            this.shiftMonth(-1);
            break;
          case 'page-down':
            this.shiftMonth(1);
            break;
          case 'home':
            this.moveTo(new Date(active.getFullYear(), active.getMonth(), 1));
            break;
          case 'end':
            this.moveTo(
              new Date(active.getFullYear(), active.getMonth(), daysInMonth(active.getFullYear(), active.getMonth())),
            );
            break;
          case 'return':
            this.selectActive();
            break;
        }
      });

    this.destroyRef.onDestroy(() => {
      this.clickService.unregister(this.id);
      this.focusService.unregister(this.id);
    });
  }

  /** Select the active date and emit its ISO string. */
  selectActive(): void {
    const active = this.active();
    if (!this.inRange(active)) return;
    this.selected.set(active);
    this.valueChange.emit(formatIsoDate(active));
    this.renderService.scheduleRender();
  }

  /** Move the active cursor to a date (clamped to min/max). */
  moveTo(date: Date): void {
    const next = startOfDay(date);
    const min = parseIsoDate(this.min());
    const max = parseIsoDate(this.max());
    if (min && next.getTime() < min.getTime()) this.active.set(min);
    else if (max && next.getTime() > max.getTime()) this.active.set(max);
    else this.active.set(next);
    this.renderService.scheduleRender();
  }

  private shiftMonth(delta: number): void {
    const active = this.active();
    const target = new Date(active.getFullYear(), active.getMonth() + delta, 1);
    const day = Math.min(active.getDate(), daysInMonth(target.getFullYear(), target.getMonth()));
    this.moveTo(new Date(target.getFullYear(), target.getMonth(), day));
  }

  private inRange(date: Date): boolean {
    const min = parseIsoDate(this.min());
    const max = parseIsoDate(this.max());
    return (!min || date.getTime() >= min.getTime()) && (!max || date.getTime() <= max.getTime());
  }

  private row(tag: string): HTMLElement {
    const row = document.createElement(tag);
    row.setAttribute('display', 'flex');
    row.setAttribute('flex-direction', 'row');
    row.setAttribute('flex-shrink', '0');
    row.setAttribute('min-height', '1');
    return row;
  }

  private cell(text: string, color: string): HTMLElement {
    const cell = document.createElement('vt-date-cell');
    cell.setAttribute('display', 'flex');
    cell.setAttribute('flex-shrink', '0');
    cell.setAttribute('min-height', '1');
    cell.setAttribute('width', String(CELL_WIDTH));
    if (color.length > 0) cell.setAttribute('color', color);
    cell.setAttribute('content', text);
    cell.textContent = text;
    return cell;
  }
}

function parseIsoDate(value: string | null): Date | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const date = new Date(year, month, day);
  if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) return null;
  return date;
}

function formatIsoDate(date: Date): string {
  return `${String(date.getFullYear()).padStart(4, '0')}-${String(date.getMonth() + 1).padStart(
    2,
    '0',
  )}-${String(date.getDate()).padStart(2, '0')}`;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
