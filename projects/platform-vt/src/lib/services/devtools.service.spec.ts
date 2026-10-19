import { describe, it, expect, beforeEach, vi } from 'vitest';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { DevtoolsService } from './devtools.service';
import { RenderService } from './render.service';
import { TerminalService } from './terminal.service';
import { InputService, type VTKeyEvent } from './input.service';
import { FocusService } from './focus.service';
import { MouseService } from './mouse.service';
import { provideClickService } from './click.service';
import { provideOverlay } from '../overlay/overlay.service';
import { cleanupDom } from '../testing/cleanup-dom';

function key(name: string, ctrl = false, shift = false): VTKeyEvent {
  return { name, ctrl, meta: false, shift, sequence: '' };
}

describe('DevtoolsService', () => {
  let service: DevtoolsService;
  let input: InputService;

  beforeEach(() => {
    cleanupDom();
    TestBed.configureTestingModule({
      providers: [
        TerminalService,
        RenderService,
        InputService,
        FocusService,
        MouseService,
        provideClickService(),
        provideOverlay(),
        provideZonelessChangeDetection(),
        DevtoolsService,
      ],
    });
    const terminal = TestBed.inject(TerminalService);
    vi.spyOn(terminal, 'write').mockImplementation(() => undefined);
    service = TestBed.inject(DevtoolsService);
    input = TestBed.inject(InputService);
  });

  it('toggles the panel with Ctrl+Shift+D', () => {
    input.simulateKey(key('d', true, true));
    expect(service.visible()).toBe(true);
    expect(document.querySelector('vt-overlay-panel')).not.toBeNull();

    input.simulateKey(key('d', true, true));
    expect(service.visible()).toBe(false);
    expect(document.querySelector('vt-overlay-panel')).toBeNull();
  });

  it('toggles with F12 as well', () => {
    input.simulateKey(key('f12'));
    expect(service.visible()).toBe(true);
    service.close();
    expect(service.visible()).toBe(false);
  });
});
