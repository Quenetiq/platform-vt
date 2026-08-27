import { TestBed } from '@angular/core/testing';
import { describe, it, expect, vi } from 'vitest';
import { FocusService, type FocusableElement } from './focus.service';
import { InputService } from './input.service';

function makeFocusable(id: string, priority: number): FocusableElement {
  return {
    id,
    priority,
    onFocus: () => undefined,
    onBlur: () => undefined,
  };
}

describe('FocusService', () => {
  let focus: FocusService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [InputService, FocusService],
    });
    focus = TestBed.inject(FocusService);
  });

  it('focuses the first registered element', () => {
    focus.register(makeFocusable('vt-button-0', 1));
    expect(focus.focusedId()).toBe('vt-button-0');
  });

  it('does not steal focus when a higher-priority element is registered later', () => {
    focus.register(makeFocusable('vt-button-0', 1));
    focus.register(makeFocusable('vt-input-0', 0));

    expect(focus.focusedId()).toBe('vt-button-0');
    expect(focus.focusedIndex()).toBe(1);
  });

  it('tabs to the next element after a higher-priority element was inserted', () => {
    focus.register(makeFocusable('vt-button-0', 1));
    focus.register(makeFocusable('vt-button-1', 1));
    focus.register(makeFocusable('vt-input-0', 0));

    focus.next();

    expect(focus.focusedId()).toBe('vt-button-1');
  });

  it('wraps around from the last element to the first', () => {
    focus.register(makeFocusable('vt-button-0', 1));
    focus.register(makeFocusable('vt-button-1', 1));

    focus.next();
    focus.next();

    expect(focus.focusedId()).toBe('vt-button-0');
  });

  it('tabs backwards with previous', () => {
    focus.register(makeFocusable('vt-button-0', 1));
    focus.register(makeFocusable('vt-button-1', 1));
    focus.register(makeFocusable('vt-button-2', 1));

    focus.next();
    focus.previous();

    expect(focus.focusedId()).toBe('vt-button-0');
  });

  it('calls onFocus and onBlur when focus moves', () => {
    const onFocus = vi.fn();
    const onBlur = vi.fn();
    focus.register({ id: 'a', priority: 1, onFocus, onBlur });
    focus.register({ id: 'b', priority: 1, onFocus, onBlur });

    focus.next();

    expect(onBlur).toHaveBeenCalled();
    expect(onFocus).toHaveBeenCalledTimes(2);
    expect(focus.focusedId()).toBe('b');
  });
});

describe('FocusService focus traps', () => {
  let focus: FocusService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [InputService, FocusService],
    });
    focus = TestBed.inject(FocusService);
  });

  function makeFocusable(id: string, priority: number, element?: Element): FocusableElement {
    return { id, priority, element, onFocus: () => undefined, onBlur: () => undefined };
  }

  it('restricts tab navigation to elements inside the trap', () => {
    const trap = document.createElement('div');
    const inside = document.createElement('button');
    const outside = document.createElement('button');
    trap.appendChild(inside);

    focus.register(makeFocusable('inside-1', 1, inside));
    focus.register(makeFocusable('outside-1', 1, outside));
    focus.register(makeFocusable('outside-2', 1, outside));

    focus.setFocusTrap(trap);

    focus.next();
    expect(focus.focusedId()).toBe('inside-1');
    // Cycling never escapes the trap.
    focus.next();
    expect(focus.focusedId()).toBe('inside-1');
  });

  it('refuses to focus elements outside the trap', () => {
    const trap = document.createElement('div');
    const inside = document.createElement('button');
    const outside = document.createElement('button');
    trap.appendChild(inside);

    focus.register(makeFocusable('inside-1', 1, inside));
    focus.register(makeFocusable('outside-1', 1, outside));

    focus.setFocusTrap(trap);
    focus.focus('outside-1');
    expect(focus.focusedId()).toBe('inside-1');
  });

  it('releases the trap with null', () => {
    const trap = document.createElement('div');
    const inside = document.createElement('button');
    const outside = document.createElement('button');
    trap.appendChild(inside);

    focus.register(makeFocusable('inside-1', 1, inside));
    focus.register(makeFocusable('outside-1', 1, outside));

    focus.setFocusTrap(trap);
    focus.setFocusTrap(null);
    focus.next();
    expect(focus.focusedId()).toBe('outside-1');
  });

  it('focusIn focuses the first focusable inside the container', () => {
    const trap = document.createElement('div');
    const first = document.createElement('button');
    const second = document.createElement('button');
    trap.appendChild(first);
    trap.appendChild(second);

    focus.register(makeFocusable('first-1', 0, first));
    focus.register(makeFocusable('second-1', 1, second));

    const ok = focus.focusIn(trap);
    expect(ok).toBe(true);
    expect(focus.focusedId()).toBe('first-1');
  });

  it('focusIn returns false when nothing focusable is inside', () => {
    const empty = document.createElement('div');
    expect(focus.focusIn(empty)).toBe(false);
  });
});
