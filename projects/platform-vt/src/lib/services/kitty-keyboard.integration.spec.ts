import { describe, it, expect, vi, beforeEach } from 'vitest';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { InputService } from './input.service';
import { TerminalService } from './terminal.service';
import { KITTY_PUSH, KITTY_QUERY } from './kitty-keyboard';

describe('kitty keyboard (InputService integration)', () => {
  let input: InputService;
  let terminal: TerminalService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [TerminalService, InputService, provideZonelessChangeDetection()],
    });
    terminal = TestBed.inject(TerminalService);
    vi.spyOn(terminal, 'write').mockImplementation(() => undefined);
    input = TestBed.inject(InputService);
  });

  it('enableKittyKeyboard pushes the mode and queries support', () => {
    const write = vi.spyOn(terminal, 'write').mockImplementation(() => undefined);
    input.enableKittyKeyboard();
    expect(write).toHaveBeenCalledWith(KITTY_PUSH + KITTY_QUERY);
  });

  it('enables kitty parsing when the terminal reports support', () => {
    input.enableKittyKeyboard();
    process.stdin.emit('data', '\x1b[?1u');

    expect(input.kittyKeyboardEnabled()).toBe(true);
  });

  it('stays on the legacy path when the terminal reports no support', () => {
    input.enableKittyKeyboard();
    process.stdin.emit('data', '\x1b[?0u');

    expect(input.kittyKeyboardEnabled()).toBe(false);
  });

  it('consumes the support response without emitting a key event', () => {
    let keys = 0;
    input.keyEvents.subscribe(() => keys++);
    input.enableKittyKeyboard();
    process.stdin.emit('data', '\x1b[?1u');

    expect(keys).toBe(0);
    expect(input.lastKey()).toBeNull();
  });

  it('emits disambiguated events with explicit modifiers', () => {
    const events: string[] = [];
    input.keyEvents.subscribe((event) =>
      events.push(`${event.ctrl ? 'ctrl-' : ''}${event.shift ? 'shift-' : ''}${event.name}`),
    );

    input.enableKittyKeyboard();
    process.stdin.emit('data', '\x1b[?1u');
    process.stdin.emit('data', '\x1b[99;5u'); // Ctrl+C
    process.stdin.emit('data', '\x1b[97;6u'); // Ctrl+Shift+A

    expect(events).toEqual(['ctrl-c', 'ctrl-shift-a']);
  });

  it('keeps legacy encodings for Enter, Tab and Backspace under the protocol', () => {
    const events: string[] = [];
    input.keyEvents.subscribe((event) => events.push(event.name));

    input.enableKittyKeyboard();
    process.stdin.emit('data', '\x1b[?1u');
    process.stdin.emit('data', '\r\t\x7f');

    expect(events).toEqual(['return', 'tab', 'backspace']);
  });

  it('parses modified arrows, F-keys and Shift+Tab', () => {
    const events: string[] = [];
    input.keyEvents.subscribe((event) => {
      events.push(`${event.shift ? 'shift-' : ''}${event.ctrl ? 'ctrl-' : ''}${event.name}`);
    });

    input.enableKittyKeyboard();
    process.stdin.emit('data', '\x1b[?1u');
    process.stdin.emit('data', '\x1b[1;2A'); // Shift+Up
    process.stdin.emit('data', '\x1b[15;5~'); // Ctrl+F5
    process.stdin.emit('data', '\x1b[9;2u'); // Shift+Tab

    expect(events).toEqual(['shift-up', 'ctrl-f5', 'shift-tab']);
  });

  it('reports terminal focus events without emitting keys', () => {
    const keys: string[] = [];
    const focusEvents: string[] = [];
    input.keyEvents.subscribe((event) => keys.push(event.name));
    input.focusEvents.subscribe((event) => focusEvents.push(event));

    process.stdin.emit('data', '\x1b[I');
    process.stdin.emit('data', '\x1b[O');

    expect(keys).toEqual([]);
    expect(focusEvents).toEqual(['focus', 'blur']);
    expect(input.lastFocus()).toBe('blur');
  });

  it('queries kitty graphics support and parses the reply', () => {
    const write = vi.spyOn(terminal, 'write').mockImplementation(() => undefined);
    input.queryKittyGraphics();
    expect(write).toHaveBeenCalledWith('\x1b_Gi=1,q=1;\x1b\\');

    process.stdin.emit('data', '\x1b_Gi=1;OK\x1b\\');
    expect(input.kittyGraphics()).toBe(true);

    input.queryKittyGraphics();
    process.stdin.emit('data', '\x1b_Gi=1;ENOSYS\x1b\\');
    expect(input.kittyGraphics()).toBe(false);
  });
});
