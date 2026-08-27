import { describe, it, expect, beforeEach, vi } from 'vitest';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { CommandPaletteService } from './command-palette.service';
import { provideKeymapService } from './keymap.service';
import { provideOverlay } from '../overlay/overlay.service';
import { OverlayContainer } from '../overlay/overlay-container';
import { RenderService } from './render.service';
import { TerminalService } from './terminal.service';
import { InputService } from './input.service';
import { FocusService } from './focus.service';
import { provideClickService } from './click.service';
import { cleanupDom } from '../testing/cleanup-dom';

describe('CommandPaletteService', () => {
  let palette: CommandPaletteService;
  let input: InputService;
  let container: OverlayContainer;

  const press = (name: string, ctrl = false): void => {
    input.simulateKey({ name, ctrl, meta: false, shift: false, sequence: name });
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        TerminalService,
        RenderService,
        InputService,
        FocusService,
        CommandPaletteService,
        provideClickService(),
        provideKeymapService(),
        provideOverlay(),
        provideZonelessChangeDetection(),
      ],
    });
    const terminal = TestBed.inject(TerminalService);
    vi.spyOn(terminal, 'write').mockImplementation(() => undefined);

    cleanupDom();
    palette = TestBed.inject(CommandPaletteService);
    input = TestBed.inject(InputService);
    container = TestBed.inject(OverlayContainer);
    (document.getElementById('vt-root') ?? document.body).appendChild(
      container.getContainerElement(),
    );
  });

  it('registers and unregisters commands', () => {
    palette.register({ title: 'Save', action: () => undefined });
    expect(palette.commands().length).toBe(1);
    palette.register({ title: 'Save', action: () => undefined });
    expect(palette.commands().length).toBe(1); // idempotent
    palette.register({ title: 'Quit', action: () => undefined });
    expect(palette.commands().length).toBe(2);
    palette.unregister('Save');
    expect(palette.commands().length).toBe(1);
  });

  it('opens on ctrl+p and mounts the palette in the overlay', () => {
    palette.register({ title: 'Save', action: () => undefined });
    press('p', true);
    expect(palette.isOpen()).toBe(true);

    const panel = document.querySelector('vt-overlay-panel');
    expect(panel).not.toBeNull();
    expect(panel?.querySelector('vt-palette')).not.toBeNull();
  });

  it('runs the selected command action and closes', () => {
    let ran = false;
    palette.register({ title: 'Save file', keywords: 'save write', action: () => (ran = true) });
    press('p', true);

    press('s');
    press('v');
    press('return');
    expect(ran).toBe(true);
    expect(palette.isOpen()).toBe(false);
  });

  it('filters commands by typed query', () => {
    palette.register({ title: 'Save file', action: () => undefined });
    palette.register({ title: 'Quit app', action: () => undefined });
    press('p', true);

    press('q');
    // Only 'Quit app' should remain; Enter activates it.
    let quitRan = false;
    palette.commands.set([
      { title: 'Save file', action: (): void => undefined },
      { title: 'Quit app', action: (): void => {
        quitRan = true;
      } },
    ]);
    palette.close();
    // Reopen and verify the full flow again from scratch.
    press('p', true);
    press('q');
    press('return');
    expect(quitRan).toBe(true);
  });

  it('closes on escape', () => {
    palette.register({ title: 'Save', action: () => undefined });
    press('p', true);
    expect(palette.isOpen()).toBe(true);
    press('escape');
    expect(palette.isOpen()).toBe(false);
  });

  it('toggle opens and closes', () => {
    palette.register({ title: 'Save', action: () => undefined });
    palette.toggle();
    expect(palette.isOpen()).toBe(true);
    palette.toggle();
    expect(palette.isOpen()).toBe(false);
  });

  it('refuses to open without commands', () => {
    palette.open();
    expect(palette.isOpen()).toBe(false);
  });
});