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
