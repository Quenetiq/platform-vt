import { describe, it, expect, beforeEach, vi } from 'vitest';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ClipboardService, provideClipboardService } from './clipboard.service';
import { TerminalService } from './terminal.service';
import { InputService } from './input.service';
import { osc } from '../output/ansi';

describe('ClipboardService kitty protocol (OSC 5522)', () => {
  let clipboard: ClipboardService;
  let terminal: TerminalService;
  let input: InputService;
  let write: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        TerminalService,
        InputService,
        provideClipboardService(),
        provideZonelessChangeDetection(),
      ],
    });
    terminal = TestBed.inject(TerminalService);
    input = TestBed.inject(InputService);
    clipboard = TestBed.inject(ClipboardService);
    write = vi.spyOn(terminal, 'write').mockImplementation(() => undefined);
  });

  it('copyKitty writes the chunked write sequence', () => {
    clipboard.copyKitty('hi');
    const calls = write.mock.calls.map((c) => String(c[0])).join('');

    expect(calls).toContain('\x1b]5522;type=write\x1b\\');
    expect(calls).toContain('\x1b]5522;type=wdata:mime=dGV4dC9wbGFpbg==;aGk=\x1b\\');
    expect(calls).toContain('\x1b]5522;type=wdata\x1b\\');
  });

  it('copyKitty chunks payloads at 4096 bytes before base64', () => {
    clipboard.copyKitty('x'.repeat(5000));
    const calls = write.mock.calls.map((c) => String(c[0])).join('');
    const chunks = calls.split('\x1b]5522;type=wdata:mime=dGV4dC9wbGFpbg==;').length - 1;
    expect(chunks).toBe(2);
  });

  it('copy uses OSC 5522 on kitty terminals and OSC 52 elsewhere', () => {
    terminal.capabilities.set({ ...terminal.capabilities(), term: 'xterm-kitty' });
    clipboard.copy('abc');
    expect(write.mock.calls.map((c) => String(c[0])).join('')).toContain('5522');

    write.mockClear();
    terminal.capabilities.set({ ...terminal.capabilities(), term: 'xterm-256color' });
    clipboard.copy('abc');
    expect(write.mock.calls.map((c) => String(c[0])).join('')).toBe(osc.clipboardWrite('abc'));
  });

  it('parses a kitty read reply into the clipboard stream', () => {
    const received: string[] = [];
    clipboard.clipboards.subscribe((text) => received.push(text));

    input.rawInput.next('\x1b]5522;type=read:status=OK\x1b\\');
    input.rawInput.next('\x1b]5522;type=read:status=DATA:mime=dGV4dC9wbGFpbg==;aGVsbG8=\x1b\\');
    input.rawInput.next('\x1b]5522;type=read:status=DONE\x1b\\');

    expect(received).toEqual(['hello']);
    expect(clipboard.lastClipboard()).toBe('hello');
  });

  it('accumulates DATA chunks split across packets', () => {
    input.rawInput.next('\x1b]5522;type=read:status=OK\x1b\\');
    input.rawInput.next('\x1b]5522;type=read:status=DATA:mime=dGV4dC9wbGFpbg==;aGVs\x1b\\');
    input.rawInput.next('\x1b]5522;type=read:status=DATA:mime=dGV4dC9wbGFpbg==;bG8=\x1b\\');
    input.rawInput.next('\x1b]5522;type=read:status=DONE\x1b\\');

    expect(clipboard.lastClipboard()).toBe('hello');
  });
});
