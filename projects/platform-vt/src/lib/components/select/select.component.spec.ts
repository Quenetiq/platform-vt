import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Component, signal } from '@angular/core';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { SelectComponent } from './select.component';
import { RenderService } from '../../services/render.service';
import { TerminalService } from '../../services/terminal.service';
import { InputService, type VTKeyEvent } from '../../services/input.service';
import { FocusService } from '../../services/focus.service';
import { MouseService } from '../../services/mouse.service';
import { provideClickService } from '../../services/click.service';

@Component({
  selector: 'vt-select-host',
  imports: [SelectComponent],
  template: `
    <vt-select
      [options]="options"
      [multiple]="multiple"
      [filterable]="filterable"
      (valueChange)="value.set($event)"
      (selectionChange)="selection.set($event)"
    ></vt-select>
  `,
})
class SelectHostComponent {
  readonly options = ['Red', 'Green', 'Blue'];
  multiple = false;
  filterable = false;
  readonly value = signal(0);
  readonly selection = signal<number[]>([]);
}

function key(name: string, ctrl = false, meta = false): VTKeyEvent {
  return { name, ctrl, meta, shift: false, sequence: '' };
}

function focusSelect(fixture: ComponentFixture<SelectHostComponent>): void {
  const focus = TestBed.inject(FocusService);
  const el = (fixture.nativeElement as HTMLElement).querySelector('vt-select')!;
  focus.clearFocus();
  focus.focus(el.getAttribute('vt-click-id')!);
}

describe('SelectComponent', () => {
  let input: InputService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [SelectHostComponent],
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
  });

  it('moves the single selection with arrows and clamps at the edges', () => {
    const fixture = TestBed.createComponent(SelectHostComponent);
    fixture.detectChanges();
    focusSelect(fixture);

    input.simulateKey(key('down'));
    expect(fixture.componentInstance.value()).toBe(1);
    input.simulateKey(key('down'));
    input.simulateKey(key('down'));
    expect(fixture.componentInstance.value()).toBe(2);
    input.simulateKey(key('up'));
    expect(fixture.componentInstance.value()).toBe(1);
  });

  it('filters options while typing and confirms with return', () => {
    const fixture = TestBed.createComponent(SelectHostComponent);
    fixture.componentInstance.filterable = true;
    fixture.detectChanges();
    focusSelect(fixture);

    input.simulateKey(key('g'));
    input.simulateKey(key('r'));
    const select = fixture.debugElement.query(By.directive(SelectComponent))
      .componentInstance as SelectComponent;
    expect(select.filter()).toBe('gr');
    expect(select.filteredOptions().map((option) => option.label)).toEqual(['Green']);

    input.simulateKey(key('return'));
    expect(fixture.componentInstance.value()).toBe(1);
    expect(select.filter()).toBe('');
  });

  it('clears the filter with escape', () => {
    const fixture = TestBed.createComponent(SelectHostComponent);
    fixture.componentInstance.filterable = true;
    fixture.detectChanges();
    focusSelect(fixture);

    input.simulateKey(key('b'));
    const select = fixture.debugElement.query(By.directive(SelectComponent))
      .componentInstance as SelectComponent;
    expect(select.filter()).toBe('b');

    input.simulateKey(key('escape'));
    expect(select.filter()).toBe('');
  });

  it('toggles multiple selections with space and return', () => {
    const fixture = TestBed.createComponent(SelectHostComponent);
    fixture.componentInstance.multiple = true;
    fixture.detectChanges();
    focusSelect(fixture);

    input.simulateKey(key(' '));
    input.simulateKey(key('down'));
    input.simulateKey(key('return'));
    expect(fixture.componentInstance.selection()).toEqual([0, 1]);

    input.simulateKey(key(' '));
    expect(fixture.componentInstance.selection()).toEqual([0]);
  });

  it('jumps to an option with type-ahead when not filterable', () => {
    const fixture = TestBed.createComponent(SelectHostComponent);
    fixture.detectChanges();
    focusSelect(fixture);

    input.simulateKey(key('b'));
    expect(fixture.componentInstance.value()).toBe(2);
  });

  it('renders selected labels in multiple mode', () => {
    const fixture = TestBed.createComponent(SelectHostComponent);
    fixture.componentInstance.multiple = true;
    fixture.detectChanges();
    focusSelect(fixture);

    input.simulateKey(key(' '));
    fixture.detectChanges();
    const el = (fixture.nativeElement as HTMLElement).querySelector('vt-select')!;
    expect(el.textContent).toContain('Red');
  });
});
