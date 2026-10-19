/**
 * A redo-aware undo history for editable values.
 *
 * Records a snapshot of the value before each edit; consecutive snapshots
 * taken within `groupMs` are coalesced into one undo step, so typing a word
 * and deleting it again undo as a whole, not per character.
 *
 * The stack is value-agnostic (works with strings, numbers, serialized
 * objects); the caller passes the pre-edit value to {@link snapshot} and the
 * current value to {@link undo}/{@link redo}.
 *
 * @example
 * ```typescript
 * const undo = new UndoStack();
 *
 * function edit(next: string): void {
 *   undo.snapshot(value);
 *   value = next;
 * }
 *
 * function onUndo(): void {
 *   const prev = undo.undo(value);
 *   if (prev !== null) value = prev;
 * }
 * ```
 */
export class UndoStack {
  private readonly undoStack: string[] = [];
  private readonly redoStack: string[] = [];
  private lastSnapshotAt: number | null = null;

  /** Snapshots closer than this (ms) are coalesced into one undo step. */
  readonly groupMs: number;

  constructor(options: { groupMs?: number } = {}) {
    this.groupMs = options.groupMs ?? 500;
  }

  /** Whether an undo step is available. */
  get canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  /** Whether a redo step is available. */
  get canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  /**
   * Record the value as it was before an edit.
   *
   * A snapshot taken within `groupMs` of the previous one merges into the
   * same undo step (the earlier value wins). Calling this clears the redo
   * stack, since the edit history has forked.
   */
  snapshot(value: string): void {
    const now = Date.now();
    if (this.lastSnapshotAt !== null && now - this.lastSnapshotAt < this.groupMs) {
      this.lastSnapshotAt = now;
      return;
    }
    this.undoStack.push(value);
    this.lastSnapshotAt = now;
    this.redoStack.length = 0;
  }

  /**
   * Undo one step.
   *
   * @param current - The current value (pushed onto the redo stack).
   * @returns The value to restore, or null when there is nothing to undo.
   */
  undo(current: string): string | null {
    if (this.undoStack.length === 0) return null;
    this.redoStack.push(current);
    this.lastSnapshotAt = null;
    return this.undoStack.pop()!;
  }

  /**
   * Redo the last undone step.
   *
   * @param current - The current value (pushed back onto the undo stack).
   * @returns The value to restore, or null when there is nothing to redo.
   */
  redo(current: string): string | null {
    if (this.redoStack.length === 0) return null;
    this.undoStack.push(current);
    this.lastSnapshotAt = null;
    return this.redoStack.pop()!;
  }

  /** Drop all history (e.g. after a submit). */
  clear(): void {
    this.undoStack.length = 0;
    this.redoStack.length = 0;
    this.lastSnapshotAt = null;
  }
}
