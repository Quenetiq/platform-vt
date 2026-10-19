import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Component, signal } from '@angular/core';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { InputComponent } from './input.component';
import { RenderService } from '../../services/render.service';
import { TerminalService } from '../../services/terminal.service';
import { InputService, type VTKeyEvent } from '../../services/input.service';
import { FocusService } from '../../services/focus.service';
import { MouseService } from '../../services/mouse.service';
import { provideClickService } from '../../services/click.service';

@Component({
  selector: 'vt-input-grapheme-host',
  imports: [InputComponent],
  template: `<vt-input [value]="'a😀b'" (valueChange)="value.set($event)"></vt-input>`,
})
class InputHostComponent {
  readonly value = signal('');
}

function key(name: string): VTKeyEvent {
  return { name, ctrl: false, meta: false, shift: false, sequence: '' };
}

function focusInput(fixture: ComponentFixture<InputHostComponent>): void {
  const focus = TestBed.inject(FocusService);
  const el = (fixture.nativeElement as HTMLElement).querySelector('vt-input')!;
  focus.clearFocus();
  focus.focus(el.getAttribute('vt-click-id')!);
}

describe('InputComponent grapheme editing', () => {
  let input: InputService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [InputHostComponent],
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

  it('moves over an emoji as one character', () => {
    const fixture = TestBed.createComponent(InputHostComponent);
    fixture.detectChanges();
    focusInput(fixture);

    input.simulateKey(key('left'));
    input.simulateKey(key('backspace'));

    expect(fixture.componentInstance.value()).toBe('ab');
  });

  it('deletes an emoji without leaving a broken surrogate', () => {
    const fixture = TestBed.createComponent(InputHostComponent);
    fixture.detectChanges();
    focusInput(fixture);

    input.simulateKey(key('left'));
    input.simulateKey(key('left'));
    input.simulateKey(key('delete'));

    expect(fixture.componentInstance.value()).toBe('ab');
  });

  it('inserts a whole emoji as one key event', () => {
    const fixture = TestBed.createComponent(InputHostComponent);
    fixture.detectChanges();
    focusInput(fixture);

    input.simulateKey(key('😀'));
    expect(fixture.componentInstance.value()).toBe('a😀b😀');
  });
});
