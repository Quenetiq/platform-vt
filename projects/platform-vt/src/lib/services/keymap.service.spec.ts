import { describe, it, expect } from 'vitest';
import { keyFromEvent, KeymapService, provideKeymapService } from './keymap.service';
import { InputService } from './input.service';
import { TerminalService } from './terminal.service';
import { provideClickService } from './click.service';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import type { VTKeyEvent } from './input.service';

describe('keyFromEvent', () => {
  const ev = (name: string, ctrl = false, meta = false, shift = false): VTKeyEvent => ({
    name,
    ctrl,
    meta,
    shift,
    sequence: '',
  });

  it('builds canonical binding strings', () => {
    expect(keyFromEvent(ev('p', true))).toBe('ctrl-p');
    expect(keyFromEvent(ev('f', false, true))).toBe('alt-f');
    expect(keyFromEvent(ev('tab', false, false, true))).toBe('shift-tab');
    expect(keyFromEvent(ev('f', true, false, true))).toBe('ctrl-shift-f');
    expect(keyFromEvent(ev('return'))).toBe('return');
    expect(keyFromEvent(ev(' '))).toBe(' ');
  });
});

describe('KeymapService', () => {
  it('dispatches bindings and unregister works', () => {
    TestBed.configureTestingModule({
      providers: [
        TerminalService,
        InputService,
        provideClickService(),
        provideKeymapService(),
        provideZonelessChangeDetection(),
      ],
    });
    const terminal = TestBed.inject(TerminalService);
    vi.spyOn(terminal, 'write').mockImplementation(() => undefined);

    const input = TestBed.inject(InputService);
    const keys = TestBed.inject(KeymapService);
    const calls: string[] = [];
    const unbind = keys.bind('ctrl-p', () => {
      calls.push('p');
    });
    keys.bind('ctrl-p q', () => {
      calls.push('q');
    });

    const emit = (e: VTKeyEvent): void => {
      input.simulateKey(e);
    };

    emit({ name: 'p', ctrl: true, meta: false, shift: false, sequence: '\x10' });
    expect(calls).toEqual(['p', 'q']);

    unbind();
    emit({ name: 'p', ctrl: true, meta: false, shift: false, sequence: '\x10' });
    expect(calls).toEqual(['p', 'q', 'q']);
  });

  it('skips bindings whose when() predicate fails', () => {
    TestBed.configureTestingModule({
      providers: [
        TerminalService,
        InputService,
        provideClickService(),
        provideKeymapService(),
        provideZonelessChangeDetection(),
      ],
    });
    const terminal = TestBed.inject(TerminalService);
    vi.spyOn(terminal, 'write').mockImplementation(() => undefined);

    const input = TestBed.inject(InputService);
    const keys = TestBed.inject(KeymapService);
    let gate = false;
    const calls: string[] = [];
    keys.bind('x', () => {
      calls.push('x');
    }, { when: () => gate });

    input.simulateKey({ name: 'x', ctrl: false, meta: false, shift: false, sequence: 'x' });
    expect(calls).toEqual([]);

    gate = true;
    input.simulateKey({ name: 'x', ctrl: false, meta: false, shift: false, sequence: 'x' });
    expect(calls).toEqual(['x']);
  });
});