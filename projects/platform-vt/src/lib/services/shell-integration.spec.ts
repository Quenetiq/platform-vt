import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { TerminalService } from './terminal.service';

describe('TerminalService shell integration marks', () => {
  let terminal: TerminalService;
  let write: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [TerminalService] });
    terminal = TestBed.inject(TerminalService);
    write = vi.spyOn(terminal, 'write').mockImplementation(() => undefined);
  });

  it('emits the OSC 133 prompt marker', () => {
    terminal.markPromptStart();
    expect(write).toHaveBeenCalledWith('\x1b]133;A\x1b\\');
  });

  it('emits command start and output markers', () => {
    terminal.markCommandStart();
    terminal.markCommandOutputStart();
    expect(write).toHaveBeenCalledWith('\x1b]133;B\x1b\\');
    expect(write).toHaveBeenCalledWith('\x1b]133;C\x1b\\');
  });

  it('emits a plain command-end marker for a successful exit', () => {
    terminal.markCommandEnd(0);
    expect(write).toHaveBeenCalledWith('\x1b]133;D\x1b\\');
  });

  it('includes the exit status when nonzero', () => {
    terminal.markCommandEnd(3);
    expect(write).toHaveBeenCalledWith('\x1b]133;D;status=3\x1b\\');
  });
});

describe('TerminalService synchronized output', () => {
  let terminal: TerminalService;
  let write: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [TerminalService] });
    terminal = TestBed.inject(TerminalService);
    write = vi.spyOn(terminal, 'write').mockImplementation(() => undefined);
  });

  it('enables with CSI 2026 and flips the signal', () => {
    terminal.enableSynchronizedOutput();
    expect(write).toHaveBeenCalledWith('\x1b[?2026h');
    expect(terminal.isSynchronizedOutput()).toBe(true);
  });

  it('disables with CSI 2026l and is idempotent', () => {
    terminal.enableSynchronizedOutput();
    terminal.enableSynchronizedOutput();
    expect(write.mock.calls.length).toBe(1);

    terminal.disableSynchronizedOutput();
    terminal.disableSynchronizedOutput();
    expect(write.mock.calls.map((c) => String(c[0]))).toContain('\x1b[?2026l');
    expect(terminal.isSynchronizedOutput()).toBe(false);
  });

  it('synchronized() wraps a function in begin/end sequences when enabled', () => {
    terminal.enableSynchronizedOutput();
    write.mockClear();

    terminal.synchronized(() => 'result');
    expect(write.mock.calls.map((c) => String(c[0]))).toEqual(['\x1b[?2026h', '\x1b[?2026l']);
  });

  it('synchronized() writes nothing while disabled', () => {
    terminal.synchronized(() => undefined);
    expect(write).not.toHaveBeenCalled();
  });
});
