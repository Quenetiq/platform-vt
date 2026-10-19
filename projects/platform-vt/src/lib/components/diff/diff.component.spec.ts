import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Component, signal } from '@angular/core';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { DiffComponent } from './diff.component';
import { RenderService } from '../../services/render.service';
import { TerminalService } from '../../services/terminal.service';
import { InputService } from '../../services/input.service';
import { FocusService } from '../../services/focus.service';
import { MouseService } from '../../services/mouse.service';
import { provideClickService } from '../../services/click.service';
import { diffLines } from '../../utils/diff';

@Component({
  selector: 'vt-diff-host',
  imports: [DiffComponent],
  template: ` <vt-diff [oldText]="old()" [newText]="new()"></vt-diff> `,
})
class DiffHostComponent {
  readonly old = signal('one\ntwo\nthree');
  readonly new = signal('one\ntwo changed\nthree\nfour');
}

describe('DiffComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [DiffHostComponent],
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
  });

  it('renders add/del/same lines with prefixes and colors', async () => {
    const fixture = TestBed.createComponent(DiffHostComponent);
    fixture.detectChanges();
    await new Promise((r) => setTimeout(r, 0));

    const rows = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('vt-diff-line'),
    ) as HTMLElement[];
    expect(rows.map((r) => r.getAttribute('content'))).toEqual([
      '  one',
      '- two',
      '+ two changed',
      '  three',
      '+ four',
    ]);
    const del = rows.find((r) => r.getAttribute('content') === '- two')!;
    const add = rows.find((r) => r.getAttribute('content') === '+ four')!;
    const same = rows[0]!;
    expect(del.getAttribute('color')).toBe('red');
    expect(add.getAttribute('color')).toBe('green');
    expect(same.getAttribute('color')).toBe('');
  });
});

describe('diffLines', () => {
  it('produces the merged add/del/same view', () => {
    expect(diffLines('a\nb\nc', 'a\nx\nc')).toEqual([
      { type: 'same', text: 'a' },
      { type: 'del', text: 'b' },
      { type: 'add', text: 'x' },
      { type: 'same', text: 'c' },
    ]);
  });

  it('handles inserts and removes at the ends', () => {
    expect(diffLines('a', 'a\nb')).toEqual([
      { type: 'same', text: 'a' },
      { type: 'add', text: 'b' },
    ]);
    expect(diffLines('a\nb', 'a')).toEqual([
      { type: 'same', text: 'a' },
      { type: 'del', text: 'b' },
    ]);
  });

  it('handles identical and empty inputs', () => {
    expect(diffLines('x\ny', 'x\ny')).toEqual([
      { type: 'same', text: 'x' },
      { type: 'same', text: 'y' },
    ]);
    expect(diffLines('', '')).toEqual([]);
    expect(diffLines('', 'a')).toEqual([{ type: 'add', text: 'a' }]);
  });
});
