import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Component, signal } from '@angular/core';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { DatePickerComponent } from './datepicker.component';
import { RenderService } from '../../services/render.service';
import { TerminalService } from '../../services/terminal.service';
import { InputService, type VTKeyEvent } from '../../services/input.service';
import { FocusService } from '../../services/focus.service';
import { MouseService } from '../../services/mouse.service';
import { provideClickService } from '../../services/click.service';

@Component({
  selector: 'vt-datepicker-host',
  imports: [DatePickerComponent],
  template: `
    <vt-datepicker
      [value]="value()"
      [min]="'2026-01-01'"
      [max]="'2026-12-31'"
      (valueChange)="value.set($event)"
    ></vt-datepicker>
  `,
})
class DatePickerHostComponent {
  readonly value = signal<string | null>('2026-03-15');
}

function key(name: string): VTKeyEvent {
  return { name, ctrl: false, meta: false, shift: false, sequence: '' };
}

function focusPicker(fixture: ComponentFixture<DatePickerHostComponent>): void {
  const focus = TestBed.inject(FocusService);
  const el = (fixture.nativeElement as HTMLElement).querySelector('vt-datepicker')!;
  focus.clearFocus();
  focus.focus(el.getAttribute('vt-click-id')!);
}

describe('DatePickerComponent', () => {
  let input: InputService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [DatePickerHostComponent],
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

  it('renders the selected month with a day grid', () => {
    const fixture = TestBed.createComponent(DatePickerHostComponent);
    fixture.detectChanges();

    const host = (fixture.nativeElement as HTMLElement).querySelector('vt-datepicker')!;
    expect(host.textContent).toContain('March 2026');
    expect(host.querySelectorAll('vt-date-week')).toHaveLength(6);
    expect(host.querySelectorAll('vt-date-cell')).toHaveLength(49); // 7 weekdays + 42 days
    expect(host.textContent).toContain('15');
  });

  it('moves the active day and selects with return', () => {
    const fixture = TestBed.createComponent(DatePickerHostComponent);
    fixture.detectChanges();
    focusPicker(fixture);

    input.simulateKey(key('right'));
    input.simulateKey(key('return'));

    expect(fixture.componentInstance.value()).toBe('2026-03-16');
  });

  it('changes month with page-down', () => {
    const fixture = TestBed.createComponent(DatePickerHostComponent);
    fixture.detectChanges();
    focusPicker(fixture);

    input.simulateKey(key('page-down'));
    input.simulateKey(key('return'));
    fixture.detectChanges();

    expect(fixture.componentInstance.value()).toBe('2026-04-15');
    const host = (fixture.nativeElement as HTMLElement).querySelector('vt-datepicker')!;
    expect(host.textContent).toContain('April 2026');
  });

  it('clamps navigation to the min/max range', () => {
    const fixture = TestBed.createComponent(DatePickerHostComponent);
    fixture.componentInstance.value.set('2026-12-31');
    fixture.detectChanges();
    focusPicker(fixture);

    input.simulateKey(key('right'));
    input.simulateKey(key('return'));
    expect(fixture.componentInstance.value()).toBe('2026-12-31');

    input.simulateKey(key('home'));
    input.simulateKey(key('return'));
    expect(fixture.componentInstance.value()).toBe('2026-12-01');
  });
});
