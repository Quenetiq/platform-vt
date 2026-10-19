import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UndoStack } from './undo-stack';

describe('UndoStack', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('undo returns the pre-edit snapshot', () => {
    const stack = new UndoStack({ groupMs: 0 });
    stack.snapshot('');
    stack.snapshot('a');
    stack.snapshot('ab');

    expect(stack.undo('abc')).toBe('ab');
    expect(stack.undo('ab')).toBe('a');
    expect(stack.undo('a')).toBe('');
  });

  it('redo replays undone steps in order', () => {
    const stack = new UndoStack();
    stack.snapshot('a');
    stack.snapshot('ab');

    expect(stack.undo('ab')).toBe('a');
    expect(stack.redo('a')).toBe('ab');
    expect(stack.redo('ab')).toBeNull();
  });

  it('coalesces snapshots within the group window', () => {
    const stack = new UndoStack({ groupMs: 500 });
    stack.snapshot('');
    vi.setSystemTime(100);
    stack.snapshot('a');
    vi.setSystemTime(200);
    stack.snapshot('ab');
    vi.setSystemTime(300);
    stack.snapshot('abc');

    // One undo step for the whole burst of typing.
    expect(stack.undo('abc')).toBe('');

    // A pause starts a new group; the snapshot is the pre-edit value.
    vi.setSystemTime(1000);
    stack.snapshot('abc');
    expect(stack.undo('abcd')).toBe('abc');
  });

  it('an edit after undo clears the redo stack', () => {
    const stack = new UndoStack();
    stack.snapshot('a');
    stack.snapshot('ab');

    stack.undo('ab');
    stack.snapshot('x');

    expect(stack.redo('x')).toBeNull();
    expect(stack.canRedo).toBe(false);
  });

  it('clear drops all history', () => {
    const stack = new UndoStack();
    stack.snapshot('a');
    stack.undo('a');

    stack.clear();
    expect(stack.canUndo).toBe(false);
    expect(stack.canRedo).toBe(false);
    expect(stack.undo('')).toBeNull();
    expect(stack.redo('')).toBeNull();
  });
});
