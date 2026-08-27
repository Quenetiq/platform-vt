import { describe, it, expect, beforeEach, vi } from 'vitest';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SelectionService, normalizeRegion, provideSelectionService } from './selection.service';
import { provideClickService } from './click.service';
import { RenderService } from './render.service';
import { TerminalService } from './terminal.service';
import { ClipboardService, provideClipboardService } from './clipboard.service';
import { InputService } from './input.service';
import { MouseService } from './mouse.service';
import type { VTMouseEvent, VTClickEvent } from './sgr-mouse';

describe('normalizeRegion', () => {
  it('orders points so x1<=x2 and y1<=y2', () => {
    expect(normalizeRegion(10, 5, 2, 8)).toEqual({ x1: 2, y1: 5, x2: 10, y2: 8 });
    expect(normalizeRegion(2, 8, 10, 5)).toEqual({ x1: 2, y1: 5, x2: 10, y2: 8 });
  });
});

describe('SelectionService', () => {
  let selection: SelectionService;
  let mouse: MouseService;
  let clipboard: ClipboardService;

  const click = (x: number, y: number, shift: boolean): VTClickEvent => ({
    x,
    y,
    button: 'left',
    shift,
    meta: false,
    ctrl: false,
  });
  const mouseEvent = (x: number, y: number, type: VTMouseEvent['type']): VTMouseEvent => ({
    x,
    y,
    type,
    button: 'left',
    shift: false,
    meta: false,
    ctrl: false,
    raw: '',
  });

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        TerminalService,
        RenderService,
        InputService,
        provideClickService(),
        provideClipboardService(),
        provideSelectionService(),
        provideZonelessChangeDetection(),
      ],
    });
    const terminal = TestBed.inject(TerminalService);
    vi.spyOn(terminal, 'write').mockImplementation(() => undefined);

    selection = TestBed.inject(SelectionService);
    mouse = TestBed.inject(MouseService);
    clipboard = TestBed.inject(ClipboardService);
  });

  it('shift+click starts a one-cell selection', () => {
    mouse.clicks.next(click(3, 4, true));
    expect(selection.region()).toEqual({ x1: 3, y1: 4, x2: 3, y2: 4 });
  });

  it('plain clicks do not start a selection', () => {
    mouse.clicks.next(click(3, 4, false));
    expect(selection.region()).toBeNull();
  });

  it('dragging extends the selection', () => {
    mouse.clicks.next(click(2, 2, true));
    mouse.mouseEvents.next(mouseEvent(5, 7, 'move'));
    expect(selection.region()).toEqual({ x1: 2, y1: 2, x2: 5, y2: 7 });
  });

  it('release completes the selection; empty text is not copied', () => {
    const copy = vi.spyOn(clipboard, 'copy').mockImplementation(() => undefined);
    mouse.clicks.next(click(2, 2, true));
    mouse.mouseEvents.next(mouseEvent(3, 2, 'move'));
    mouse.mouseEvents.next(mouseEvent(3, 2, 'up'));

    expect(selection.region()).toEqual({ x1: 2, y1: 2, x2: 3, y2: 2 });
    // Nothing rendered yet, so the region has no text: nothing is copied.
    expect(copy).not.toHaveBeenCalled();
  });

  it('escape clears the selection', () => {
    mouse.clicks.next(click(1, 1, true));
    expect(selection.region()).not.toBeNull();
    (TestBed.inject(InputService) as unknown as { keySubject: { next: (e: unknown) => void } }).keySubject.next({
      name: 'escape',
      ctrl: false,
      meta: false,
      shift: false,
      sequence: '\x1b',
    });
    expect(selection.region()).toBeNull();
  });

  it('clear() resets the state', () => {
    mouse.clicks.next(click(1, 1, true));
    selection.clear();
    expect(selection.region()).toBeNull();
  });
});