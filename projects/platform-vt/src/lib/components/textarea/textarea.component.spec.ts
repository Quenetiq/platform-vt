import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Component, signal } from '@angular/core';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TextAreaComponent } from './textarea.component';
import { RenderService } from '../../services/render.service';
import { TerminalService } from '../../services/terminal.service';
import { InputService } from '../../services/input.service';
import { FocusService } from '../../services/focus.service';
import { MouseService } from '../../services/mouse.service';
import { provideClickService } from '../../services/click.service';
import type { VTKeyEvent } from '../../services/input.service';

@Component({
  selector: 'vt-textarea-host',
  imports: [TextAreaComponent],
  template: `
    <vt-textarea [vim]="true" [value]="value()" (valueChange)="value.set($event)"></vt-textarea>
  `,
})
class TextAreaHostComponent {
  readonly value = signal('alpha beta\ngamma delta');
}

function key(name: string): VTKeyEvent {
  return { name, ctrl: false, meta: false, shift: false, sequence: '' };
}

describe('TextAreaComponent vim mode', () => {
  let input: InputService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [TextAreaHostComponent],
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

  function host(): TextAreaHostComponent {
    const fixture = TestBed.createComponent(TextAreaHostComponent);
    fixture.detectChanges();
    // The buffer is synced from the value input on focus; the auto-focus
    // during construction runs before the first change-detection pass, so
    // re-focus after render to pick up the initial value. The id is read
    // from the element (the focusable list may contain stale entries).
    const focus = TestBed.inject(FocusService);
    const el = (fixture.nativeElement as HTMLElement).querySelector('vt-textarea')!;
    const id = el.getAttribute('vt-click-id')!;
    focus.clearFocus();
    focus.focus(id);
    return fixture.componentInstance;
  }

  it('starts in normal mode and h/j/k/l move the cursor', () => {
    const h = host();

    // Cursor starts at (0, 0). j → row 1, l → col 1.
    input.simulateKey(key('j'));
    input.simulateKey(key('l'));

    // In normal mode, typing text does not insert characters.
    input.simulateKey(key('q'));
    expect(h.value()).toBe('alpha beta\ngamma delta');
  });

  it('i enters insert mode and inserts at the cursor', () => {
    const h = host();

    input.simulateKey(key('i'));
    input.simulateKey(key('X'));
    input.simulateKey(key('escape'));

    expect(h.value()).toBe('Xalpha beta\ngamma delta');
  });

  it('A appends at the end of the line', () => {
    const h = host();

    input.simulateKey(key('A'));
    input.simulateKey(key('!'));
    input.simulateKey(key('escape'));

    expect(h.value()).toBe('alpha beta!\ngamma delta');
  });

  it('0 and $ jump to the line start and end', () => {
    const h = host();

    input.simulateKey(key('j')); // row 1
    input.simulateKey(key('0')); // col 0
    input.simulateKey(key('i'));
    input.simulateKey(key('>'));

    expect(h.value()).toBe('alpha beta\n>gamma delta');

    input.simulateKey(key('escape'));
    input.simulateKey(key('$'));
    input.simulateKey(key('i'));
    input.simulateKey(key('<'));
    expect(h.value()).toBe('alpha beta\n>gamma delta<');
  });

  it('x deletes the character under the cursor', () => {
    const h = host();

    input.simulateKey(key('x'));
    expect(h.value()).toBe('lpha beta\ngamma delta');

    // Repeated x keeps deleting.
    input.simulateKey(key('x'));
    expect(h.value()).toBe('pha beta\ngamma delta');
  });

  it('dd deletes the current line', () => {
    const h = host();

    input.simulateKey(key('j'));
    input.simulateKey(key('d'));
    input.simulateKey(key('d'));

    expect(h.value()).toBe('alpha beta');
  });

  it('w and b move by words', () => {
    const h = host();

    input.simulateKey(key('w')); // start of 'beta'
    input.simulateKey(key('i'));
    input.simulateKey(key('|'));
    input.simulateKey(key('escape'));

    expect(h.value()).toBe('alpha |beta\ngamma delta');

    // '|beta' is a single word (vim counts '|' as a word char), so one 'b'
    // lands on its start; a second 'b' reaches the start of 'alpha'.
    input.simulateKey(key('b'));
    input.simulateKey(key('b'));
    input.simulateKey(key('i'));
    input.simulateKey(key('|'));
    expect(h.value()).toBe('|alpha |beta\ngamma delta');
  });

  it('o opens a new line below and enters insert mode', () => {
    const h = host();

    input.simulateKey(key('o'));
    input.simulateKey(key('n'));
    input.simulateKey(key('e'));
    input.simulateKey(key('w'));
    input.simulateKey(key('escape'));

    expect(h.value()).toBe('alpha beta\nnew\ngamma delta');
  });

  it('escape returns to normal mode; normal keys are consumed', () => {
    const h = host();

    input.simulateKey(key('i'));
    input.simulateKey(key('a'));
    input.simulateKey(key('escape'));
    input.simulateKey(key('escape')); // already normal, no-op

    expect(h.value()).toBe('aalpha beta\ngamma delta');
  });

  it('vimMode signal tracks the mode', () => {
    const fixture = TestBed.createComponent(TextAreaHostComponent);
    fixture.detectChanges();
    const textarea = (fixture.nativeElement as HTMLElement).querySelector('vt-textarea')!;

    const modes: string[] = [];
    // Access the component instance through the debug element.
    const comp = fixture.debugElement.query((de) => de.nativeElement === textarea)
      ?.componentInstance as TextAreaComponent;
    let current = comp.vimMode();
    modes.push(current);
    input.simulateKey(key('i'));
    current = comp.vimMode();
    modes.push(current);
    input.simulateKey(key('escape'));
    modes.push(comp.vimMode());

    expect(modes).toEqual(['normal', 'insert', 'normal']);
  });

  it('u in normal mode undoes edits', () => {
    const h = host();

    input.simulateKey(key('i'));
    input.simulateKey(key('X'));
    input.simulateKey(key('escape'));
    expect(h.value()).toBe('Xalpha beta\ngamma delta');

    input.simulateKey(key('u'));
    expect(h.value()).toBe('alpha beta\ngamma delta');
  });

  it('ctrl-z undoes and ctrl-y redoes in insert mode', () => {
    const h = host();

    input.simulateKey(key('i'));
    input.simulateKey(key('X'));
    expect(h.value()).toBe('Xalpha beta\ngamma delta');

    input.simulateKey({ name: 'z', ctrl: true, meta: false, shift: false, sequence: '' });
    expect(h.value()).toBe('alpha beta\ngamma delta');

    input.simulateKey({ name: 'y', ctrl: true, meta: false, shift: false, sequence: '' });
    expect(h.value()).toBe('Xalpha beta\ngamma delta');
  });

  it('ctrl+alt+down adds an extra cursor and typing edits every row', () => {
    const h = host();

    input.simulateKey({ name: 'down', ctrl: true, meta: true, shift: false, sequence: '' });
    input.simulateKey(key('i'));
    input.simulateKey(key('X'));
    input.simulateKey(key('escape'));

    expect(h.value()).toBe('Xalpha beta\nXgamma delta');
  });

  it('backspace removes at every cursor', () => {
    const h = host();

    // Move to the end of row 0, add a cursor at the end of row 1, then
    // delete the last character of both rows.
    input.simulateKey(key('end'));
    input.simulateKey({ name: 'down', ctrl: true, meta: true, shift: false, sequence: '' });
    input.simulateKey(key('i'));
    input.simulateKey({ name: 'backspace', ctrl: false, meta: false, shift: false, sequence: '' });
    input.simulateKey(key('escape'));

    expect(h.value()).toBe('alpha bet\ngamma dela');
  });

  it('delete removes at every cursor', () => {
    const h = host();

    // Move the primary cursor to the start, add a cursor below (also at
    // the start), then delete the first character of both rows.
    input.simulateKey(key('home'));
    input.simulateKey({ name: 'down', ctrl: true, meta: true, shift: false, sequence: '' });
    input.simulateKey({ name: 'delete', ctrl: false, meta: false, shift: false, sequence: '' });

    expect(h.value()).toBe('lpha beta\namma delta');
  });

  it('ctrl+alt+up removes the extra cursor again', () => {
    const fixture = TestBed.createComponent(TextAreaHostComponent);
    fixture.detectChanges();
    const focus = TestBed.inject(FocusService);
    const el = (fixture.nativeElement as HTMLElement).querySelector('vt-textarea')!;
    const id = el.getAttribute('vt-click-id')!;
    focus.clearFocus();
    focus.focus(id);
    const comp = fixture.debugElement.query((de) => de.nativeElement === el)
      ?.componentInstance as TextAreaComponent;

    input.simulateKey({ name: 'down', ctrl: true, meta: true, shift: false, sequence: '' });
    expect(comp.extraCursors()).toHaveLength(1);

    // Toggling again on the same row removes the extra cursor.
    input.simulateKey({ name: 'down', ctrl: true, meta: true, shift: false, sequence: '' });
    expect(comp.extraCursors()).toHaveLength(0);
  });
});
