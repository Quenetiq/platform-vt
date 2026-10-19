import { describe, it, expect, beforeEach, afterEach, vi, type MockInstance } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { TerminalService, detectCapabilities } from './terminal.service';

describe('TerminalService integrations', () => {
  let terminal: TerminalService;
  let write: MockInstance;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [TerminalService] });
    terminal = TestBed.inject(TerminalService);
    write = vi.spyOn(terminal, 'write').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it('honours NO_COLOR and FORCE_COLOR', () => {
    vi.stubEnv('NO_COLOR', '1');
    expect(detectCapabilities().colors).toBe('none');

    vi.unstubAllEnvs();
    vi.stubEnv('FORCE_COLOR', '0');
    expect(detectCapabilities().colors).toBe('none');

    vi.stubEnv('FORCE_COLOR', '2');
    expect(detectCapabilities().colors).toBe(256);

    vi.stubEnv('FORCE_COLOR', '3');
    expect(detectCapabilities().colors).toBe('truecolor');
  });

  it('sets and restores the window title', () => {
    terminal.pushTitle();
    terminal.setTitle('My app');
    expect(write).toHaveBeenCalledWith('\x1b[22;2t');
    expect(write).toHaveBeenCalledWith('\x1b]2;My app\x07');
    expect(terminal.title()).toBe('My app');

    terminal.restoreTitle();
    expect(write).toHaveBeenCalledWith('\x1b[23;2t');
    expect(terminal.title()).toBeNull();
  });

  it('emits notifications and progress', () => {
    terminal.notify('Build finished', 'CI');
    expect(write).toHaveBeenCalledWith('\x1b]9;CI: Build finished\x07');

    terminal.setProgress('normal', 42);
    expect(write).toHaveBeenCalledWith('\x1b]9;4;1;42\x07');
    expect(terminal.progress()).toEqual({ state: 'normal', value: 42 });

    terminal.clearProgress();
    expect(write).toHaveBeenCalledWith('\x1b]9;4;0;0\x07');
    expect(terminal.progress()).toBeNull();
  });

  it('clamps progress values', () => {
    terminal.setProgress('warning', 150);
    expect(write).toHaveBeenCalledWith('\x1b]9;4;4;100\x07');
  });

  it('sets the cursor shape and flashes', () => {
    vi.useFakeTimers();
    terminal.setCursorStyle('bar', false);
    expect(write).toHaveBeenCalledWith('\x1b[6 q');
    expect(terminal.cursorShape()).toBe('bar');

    terminal.flash(50);
    expect(write).toHaveBeenCalledWith('\x1b[?5h');
    vi.advanceTimersByTime(60);
    expect(write).toHaveBeenCalledWith('\x1b[?5l');
  });

  it('restores cursor style and progress on cleanup', () => {
    terminal.setCursorStyle('underline');
    terminal.setProgress('indeterminate');
    terminal.cleanup();
    expect(write).toHaveBeenCalledWith('\x1b[0 q');
    expect(write).toHaveBeenCalledWith('\x1b]9;4;0;0\x07');
    expect(terminal.cursorShape()).toBe('default');
    expect(terminal.progress()).toBeNull();
  });
});
