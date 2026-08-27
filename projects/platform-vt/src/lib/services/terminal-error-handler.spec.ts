import { describe, it, expect, beforeEach, vi } from 'vitest';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TerminalErrorHandler, provideTerminalErrorHandler } from './terminal-error-handler';
import { RenderService } from './render.service';
import { TerminalService } from './terminal.service';
import { InputService } from './input.service';
import { FocusService } from './focus.service';
import { provideClickService } from './click.service';

describe('TerminalErrorHandler', () => {
  let handler: TerminalErrorHandler;
  let terminal: TerminalService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        TerminalService,
        RenderService,
        InputService,
        FocusService,
        TerminalErrorHandler,
        provideClickService(),
        provideZonelessChangeDetection(),
        provideTerminalErrorHandler(),
      ],
    });
    terminal = TestBed.inject(TerminalService);
    handler = TestBed.inject(TerminalErrorHandler);
    const root = document.createElement('app-root');
    root.id = 'vt-root';
    document.body.appendChild(root);
  });

  afterEach(() => {
    document.getElementById('vt-root')?.remove();
  });

  it('renders an error overlay with the message on unhandled errors', () => {
    const write = vi.spyOn(terminal, 'write').mockImplementation(() => undefined);
    handler.handleError(new Error('boom'));

    const overlay = document.querySelector('vt-error-overlay');
    expect(overlay).not.toBeNull();
    expect(overlay!.getAttribute('content')).toContain('Unhandled error');
    expect(overlay!.getAttribute('content')).toContain('boom');
    expect(write).toHaveBeenCalledWith(expect.stringContaining('boom'));
  });

  it('shows the error screen only once', () => {
    handler.handleError(new Error('first'));
    handler.handleError(new Error('second'));

    const overlays = document.querySelectorAll('vt-error-overlay');
    expect(overlays.length).toBe(1);
  });

  it('handles non-Error values', () => {
    handler.handleError('plain string failure');
    const overlay = document.querySelector('vt-error-overlay');
    expect(overlay!.getAttribute('content')).toContain('plain string failure');
  });
});