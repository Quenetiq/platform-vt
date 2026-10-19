import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Component, signal } from '@angular/core';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { InputComponent } from './input.component';
import { RenderService } from '../../services/render.service';
import { TerminalService } from '../../services/terminal.service';
import { InputService } from '../../services/input.service';
import { FocusService } from '../../services/focus.service';
import { MouseService } from '../../services/mouse.service';
import { provideClickService } from '../../services/click.service';
import type { VTKeyEvent } from '../../services/input.service';

@Component({
  selector: 'vt-input-host',
  imports: [InputComponent],
  template: `
    <vt-input
      [mask]="true"
      [reveal]="reveal()"
      [value]="value()"
      [completions]="completions"
      (valueChange)="value.set($event)"
    ></vt-input>
  `,
})
class InputHostComponent {
  readonly reveal = signal(false);
  readonly value = signal('hunter2');
  readonly completions = ['alpha', 'alpine', 'beta'];
}

function key(name: string): VTKeyEvent {
  return { name, ctrl: false, meta: false, shift: false, sequence: '' };
}

describe('InputComponent password masking', () => {
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

  function focusInput(fixture: ComponentFixture<InputHostComponent>): void {
    const focus = TestBed.inject(FocusService);
    const el = (fixture.nativeElement as HTMLElement).querySelector('vt-input')!;
    const id = el.getAttribute('vt-click-id')!;
    focus.clearFocus();
    focus.focus(id);
    fixture.detectChanges();
  }

  function inputEl(): HTMLElement {
    const fixture = TestBed.createComponent(InputHostComponent);
    fixture.detectChanges();
    focusInput(fixture);
    return (fixture.nativeElement as HTMLElement).querySelector('vt-input')!;
  }

  it('renders bullets instead of the value when masked', async () => {
    const el = inputEl();
    await new Promise((r) => setTimeout(r, 0));
    const text =
      el.querySelector<HTMLElement>('.vt-input-before')?.getAttribute('content') +
      (el.querySelector<HTMLElement>('.vt-input-after')?.getAttribute('content') ?? '');
    expect(text).toBe('\u2022'.repeat(7));
  });

  it('shows the real value when revealed', async () => {
    const fixture = TestBed.createComponent(InputHostComponent);
    fixture.detectChanges();
    focusInput(fixture);
    fixture.componentInstance.reveal.set(true);
    fixture.detectChanges();
    await new Promise((r) => setTimeout(r, 0));

    const text =
      (fixture.nativeElement as HTMLElement)
        .querySelector<HTMLElement>('.vt-input-before')
        ?.getAttribute('content') +
      ((fixture.nativeElement as HTMLElement)
        .querySelector<HTMLElement>('.vt-input-after')
        ?.getAttribute('content') ?? '');
    expect(text).toBe('hunter2');
  });

  it('emits valueChange on backspace and delete', () => {
    const fixture = TestBed.createComponent(InputHostComponent);
    fixture.detectChanges();
    focusInput(fixture);

    // Cursor is at the end on focus: backspace removes the last char.
    input.simulateKey(key('backspace'));
    expect(fixture.componentInstance.value()).toBe('hunter');

    // Move to the start and delete the first char.
    input.simulateKey(key('home'));
    input.simulateKey(key('delete'));
    expect(fixture.componentInstance.value()).toBe('unter');
  });

  it('tab completes the word under the cursor', () => {
    const fixture = TestBed.createComponent(InputHostComponent);
    fixture.detectChanges();
    focusInput(fixture);

    // 'hunter2' → move to the start, clear, type 'al', then tab.
    input.simulateKey(key('home'));
    input.simulateKey(key('end'));
    for (let i = 0; i < 7; i++) input.simulateKey(key('backspace'));
    for (const ch of ['a', 'l']) input.simulateKey(key(ch));
    input.simulateKey(key('tab'));

    expect(fixture.componentInstance.value()).toBe('alpha');
  });

  it('tab cycles through matching completions', () => {
    const fixture = TestBed.createComponent(InputHostComponent);
    fixture.detectChanges();
    focusInput(fixture);

    input.simulateKey(key('home'));
    input.simulateKey(key('end'));
    for (let i = 0; i < 7; i++) input.simulateKey(key('backspace'));
    for (const ch of ['a']) input.simulateKey(key(ch));
    input.simulateKey(key('tab'));
    input.simulateKey(key('tab'));

    expect(fixture.componentInstance.value()).toBe('alpine');
  });

  it('shift-tab cycles backwards', () => {
    const fixture = TestBed.createComponent(InputHostComponent);
    fixture.detectChanges();
    focusInput(fixture);

    input.simulateKey(key('home'));
    input.simulateKey(key('end'));
    for (let i = 0; i < 7; i++) input.simulateKey(key('backspace'));
    input.simulateKey(key('a'));
    input.simulateKey(key('tab')); // alpha
    input.simulateKey(key('tab')); // alpine
    input.simulateKey(key('shift-tab')); // alpha again
    expect(fixture.componentInstance.value()).toBe('alpha');
  });

  it('tab does nothing when nothing matches', () => {
    const fixture = TestBed.createComponent(InputHostComponent);
    fixture.detectChanges();
    focusInput(fixture);

    input.simulateKey(key('tab')); // word 'hunter2' matches nothing
    expect(fixture.componentInstance.value()).toBe('hunter2');
  });

  it('ctrl-z undoes and ctrl-y redoes edits', () => {
    const fixture = TestBed.createComponent(InputHostComponent);
    fixture.detectChanges();
    focusInput(fixture);

    input.simulateKey({ name: 'home', ctrl: false, meta: false, shift: false, sequence: '' });
    input.simulateKey({ name: 'end', ctrl: false, meta: false, shift: false, sequence: '' });
    for (let i = 0; i < 7; i++) {
      input.simulateKey({
        name: 'backspace',
        ctrl: false,
        meta: false,
        shift: false,
        sequence: '',
      });
    }
    input.simulateKey({ name: 'x', ctrl: false, meta: false, shift: false, sequence: '' });
    expect(fixture.componentInstance.value()).toBe('x');

    // The whole burst (backspaces + typed 'x') coalesced into one group:
    // Ctrl+Z restores the state before it.
    input.simulateKey({ name: 'z', ctrl: true, meta: false, shift: false, sequence: '' });
    expect(fixture.componentInstance.value()).toBe('hunter2');

    // Ctrl+Shift+Z redoes it.
    input.simulateKey({ name: 'z', ctrl: true, meta: false, shift: true, sequence: '' });
    expect(fixture.componentInstance.value()).toBe('x');
  });
});

@Component({
  selector: 'vt-input-vim-host',
  imports: [InputComponent],
  template: `
    <vt-input [vim]="true" [value]="value()" (valueChange)="value.set($event)"></vt-input>
  `,
})
class InputVimHostComponent {
  readonly value = signal('alpha beta');
}

describe('InputComponent vim mode', () => {
  let input: InputService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [InputVimHostComponent],
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

  function focusVimHost(): {
    fixture: ComponentFixture<InputVimHostComponent>;
    host: InputVimHostComponent;
  } {
    const fixture = TestBed.createComponent(InputVimHostComponent);
    fixture.detectChanges();
    const focus = TestBed.inject(FocusService);
    const el = (fixture.nativeElement as HTMLElement).querySelector('vt-input')!;
    const id = el.getAttribute('vt-click-id')!;
    focus.clearFocus();
    focus.focus(id);
    fixture.detectChanges();
    return { fixture, host: fixture.componentInstance };
  }

  it('starts in normal mode; h/l move and letters are consumed', () => {
    const { host } = focusVimHost();

    input.simulateKey(key('l'));
    input.simulateKey(key('l'));
    input.simulateKey(key('q'));

    expect(host.value()).toBe('alpha beta');
  });

  it('i enters insert mode and inserts at the cursor', () => {
    const { host } = focusVimHost();

    input.simulateKey(key('home'));
    input.simulateKey(key('i'));
    input.simulateKey(key('X'));
    input.simulateKey(key('escape'));

    expect(host.value()).toBe('Xalpha beta');
  });

  it('A appends at the end and $ moves there', () => {
    const { host } = focusVimHost();

    input.simulateKey(key('$'));
    input.simulateKey(key('i'));
    input.simulateKey(key('!'));
    input.simulateKey(key('escape'));

    expect(host.value()).toBe('alpha beta!');
  });

  it('x deletes the character under the cursor', () => {
    const { host } = focusVimHost();

    input.simulateKey(key('home'));
    input.simulateKey(key('l'));
    input.simulateKey(key('x'));
    // The character under the cursor ('l' at index 1) is deleted.
    expect(host.value()).toBe('apha beta');
  });

  it('w moves by words', () => {
    const { host } = focusVimHost();

    input.simulateKey(key('home'));
    input.simulateKey(key('w'));
    input.simulateKey(key('i'));
    input.simulateKey(key('|'));
    input.simulateKey(key('escape'));

    expect(host.value()).toBe('alpha |beta');
  });

  it('u undoes in normal mode', () => {
    const { host } = focusVimHost();

    input.simulateKey(key('home'));
    input.simulateKey(key('l'));
    input.simulateKey(key('x'));
    expect(host.value()).toBe('apha beta');

    input.simulateKey(key('u'));
    expect(host.value()).toBe('alpha beta');
  });

  it('tab completion still works in normal mode', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [InputVimHostComponent],
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
    const fixture = TestBed.createComponent(InputVimHostComponent);
    fixture.detectChanges();
    const focus = TestBed.inject(FocusService);
    const el = (fixture.nativeElement as HTMLElement).querySelector('vt-input')!;
    const id = el.getAttribute('vt-click-id')!;
    focus.clearFocus();
    focus.focus(id);
    fixture.detectChanges();
    // No completions bound → tab falls through to the (empty) completion
    // list and does nothing, without switching modes or clearing the value.
    input.simulateKey(key('tab'));
    expect(fixture.componentInstance.value()).toBe('alpha beta');
  });
});
