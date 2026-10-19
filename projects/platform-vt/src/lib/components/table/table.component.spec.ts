import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Component, signal } from '@angular/core';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { TableComponent } from './table.component';
import { RenderService } from '../../services/render.service';
import { TerminalService } from '../../services/terminal.service';
import { InputService } from '../../services/input.service';
import { FocusService } from '../../services/focus.service';
import { MouseService } from '../../services/mouse.service';
import { provideClickService } from '../../services/click.service';
import type { VTKeyEvent } from '../../services/input.service';

@Component({
  selector: 'vt-table-host',
  imports: [TableComponent],
  template: `
    <vt-table
      [columns]="columns"
      [rows]="rows"
      [viewportRows]="3"
      [filter]="filter()"
      [multiSelect]="multiSelect"
      [resizable]="resizable"
      [reorderable]="reorderable"
      [stickyHeader]="stickyHeader"
      (selectedChange)="selected.set($event)"
      (selectionChange)="selection.set($event)"
      (columnWidthsChange)="widths.set($event)"
      (columnOrderChange)="order.set($event)"
    ></vt-table>
  `,
})
class TableHostComponent {
  readonly columns = ['A', 'B'];
  readonly rows = Array.from({ length: 12 }, (_, i) => [`row${String(i)}`, `v${String(i)}`]);
  readonly filter = signal('');
  multiSelect = false;
  resizable = false;
  reorderable = false;
  stickyHeader = true;
  readonly selected = signal(-1);
  readonly selection = signal<number[]>([]);
  readonly widths = signal<number[]>([]);
  readonly order = signal<number[]>([]);
}

function key(name: string, ctrl = false, shift = false, meta = false): VTKeyEvent {
  return { name, ctrl, meta, shift, sequence: '' };
}

function focusTable(fixture: ComponentFixture<TableHostComponent>): void {
  const focus = TestBed.inject(FocusService);
  const el = (fixture.nativeElement as HTMLElement).querySelector('vt-table')!;
  const id = el.getAttribute('vt-click-id')!;
  focus.clearFocus();
  focus.focus(id);
}

describe('TableComponent keyboard navigation', () => {
  let input: InputService;
  let focus: FocusService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [TableHostComponent],
      providers: [
        TerminalService,
        RenderService,
        InputService,
        FocusService,
        MouseService,
        provideClickService(),
        provideZonelessChangeDetection(),
      ],
    });
    const terminal = TestBed.inject(TerminalService);
    vi.spyOn(terminal, 'write').mockImplementation(() => undefined);
    input = TestBed.inject(InputService);
    focus = TestBed.inject(FocusService);
  });

  it('focuses the table and moves the selection with arrows', () => {
    const fixture = TestBed.createComponent(TableHostComponent);
    fixture.detectChanges();

    focusTable(fixture);

    input.simulateKey(key('down'));
    input.simulateKey(key('down'));
    input.simulateKey(key('up'));

    // -1 -> 0 -> 1 -> 0
    expect(fixture.componentInstance.selected()).toBe(0);
  });

  it('page-down jumps a viewport and keeps the selection visible', () => {
    const fixture = TestBed.createComponent(TableHostComponent);
    fixture.detectChanges();
    focusTable(fixture);

    input.simulateKey(key('page-down'));

    // viewportRows=3 → jumps from -1 to row 2.
    expect(fixture.componentInstance.selected()).toBe(2);
  });

  it('page-up jumps back a viewport', () => {
    const fixture = TestBed.createComponent(TableHostComponent);
    fixture.detectChanges();
    focusTable(fixture);

    input.simulateKey(key('page-down'));
    input.simulateKey(key('page-down'));
    input.simulateKey(key('page-up'));

    // -1 -> 2 -> 5 -> 2
    expect(fixture.componentInstance.selected()).toBe(2);
  });

  it('home and end jump to the first and last row', () => {
    const fixture = TestBed.createComponent(TableHostComponent);
    fixture.detectChanges();
    focusTable(fixture);

    input.simulateKey(key('end'));
    expect(fixture.componentInstance.selected()).toBe(11);

    input.simulateKey(key('home'));
    expect(fixture.componentInstance.selected()).toBe(0);
  });

  it('clamps page jumps at the first and last row', () => {
    const fixture = TestBed.createComponent(TableHostComponent);
    fixture.detectChanges();
    focusTable(fixture);

    input.simulateKey(key('page-up'));
    expect(fixture.componentInstance.selected()).toBe(-1);

    input.simulateKey(key('end'));
    input.simulateKey(key('page-down'));
    expect(fixture.componentInstance.selected()).toBe(11);
  });

  it('filters rows and maps selection to original indices', () => {
    const fixture = TestBed.createComponent(TableHostComponent);
    fixture.componentInstance.filter.set('v3');
    fixture.detectChanges();
    focusTable(fixture);

    input.simulateKey(key('end'));
    expect(fixture.componentInstance.selected()).toBe(3);

    const rows = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('vt-table-line'));
    expect(rows.some((row) => (row.textContent ?? '').includes('row3'))).toBe(true);
    expect(rows.some((row) => (row.textContent ?? '').includes('row4'))).toBe(false);
  });

  it('toggles multiple rows with space', () => {
    const fixture = TestBed.createComponent(TableHostComponent);
    fixture.componentInstance.multiSelect = true;
    fixture.detectChanges();
    focusTable(fixture);

    input.simulateKey(key('down'));
    input.simulateKey(key(' '));
    input.simulateKey(key('down'));
    input.simulateKey(key(' '));
    expect(fixture.componentInstance.selection()).toEqual([0, 1]);

    input.simulateKey(key(' '));
    expect(fixture.componentInstance.selection()).toEqual([0]);
  });

  it('resizes the active column with ctrl+arrows', () => {
    const fixture = TestBed.createComponent(TableHostComponent);
    fixture.componentInstance.resizable = true;
    fixture.detectChanges();
    focusTable(fixture);

    input.simulateKey(key('right', true));
    const widths = fixture.componentInstance.widths();
    // Column A is "row10" wide (5) + padding (2) = 7 before resizing.
    expect(widths[0]).toBe(8);
  });

  it('reorders the active column with alt+arrows', () => {
    const fixture = TestBed.createComponent(TableHostComponent);
    fixture.componentInstance.reorderable = true;
    fixture.detectChanges();
    focusTable(fixture);

    input.simulateKey(key('right', false, false, true));
    expect(fixture.componentInstance.order()).toEqual([1, 0]);
  });

  it('hides the header when scrolled if stickyHeader is false', () => {
    const fixture = TestBed.createComponent(TableHostComponent);
    fixture.componentInstance.stickyHeader = false;
    fixture.detectChanges();
    focusTable(fixture);

    input.simulateKey(key('end'));
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).querySelector('vt-table')!.textContent ?? '';
    expect(text).not.toContain('\u2502 A \u2502');
    expect(text).toContain('row11');
  });

  it('ignores navigation keys while not focused', () => {
    const fixture = TestBed.createComponent(TableHostComponent);
    fixture.detectChanges();

    focus.clearFocus();
    input.simulateKey(key('down'));
    input.simulateKey(key('end'));

    expect(fixture.componentInstance.selected()).toBe(-1);
  });
});
