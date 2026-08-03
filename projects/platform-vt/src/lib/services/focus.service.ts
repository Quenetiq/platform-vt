import { Injectable, inject, signal, computed } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { InputService, type VTKeyEvent } from './input.service';

/**
 * Represents a focusable element in the terminal UI.
 */
export interface FocusableElement {
  /** Unique identifier for this element. */
  id: string;
  /** Lower number = higher priority for focus order. */
  priority: number;
  /** Called when this element receives focus. */
  onFocus: () => void;
  /** Called when this element loses focus. */
  onBlur: () => void;
}

/**
 * Manages keyboard focus navigation across interactive terminal components.
 *
 * Handles Tab (next) and Shift+Tab (previous) navigation. Components
 * register/unregister themselves as focusable elements.
 *
 * @example
 * ```typescript
 * const focus = inject(FocusService);
 * focus.next();      // move focus to next element
 * focus.previous();  // move focus to previous element
 * focus.focus('my-input-id');  // focus a specific element
 * ```
 */
@Injectable()
export class FocusService {
  private readonly input = inject(InputService);

  /** All registered focusable elements, sorted by priority. */
  readonly focusables = signal<FocusableElement[]>([]);

  /** ID of the currently focused element, or null. */
  readonly focusedId = signal<string | null>(null);

  /** Index of the currently focused element in the sorted list. */
  readonly focusedIndex = computed(() => {
    const id = this.focusedId();
    if (!id) return -1;
    return this.focusables().findIndex((f) => f.id === id);
  });

  /** The currently focused element object, or null. */
  readonly focused = computed(() => {
    const id = this.focusedId();
    return this.focusables().find((f) => f.id === id) ?? null;
  });

  /** Total number of registered focusable elements. */
  readonly focusCount = computed(() => this.focusables().length);

  constructor() {
    this.input.keyEvents
      .pipe(
        filter(
          (event): event is VTKeyEvent =>
            event.name === 'tab' || event.name === 'shift-tab',
        ),
        takeUntilDestroyed(),
      )
      .subscribe((event) => {
        if (event.name === 'tab') {
          this.next();
        } else {
          this.previous();
        }
      });
  }

  /** ID of the last registered input element, or null. */
  private lastInputId = signal<string | null>(null);

  /** Register a focusable element. Elements are sorted by priority. */
  register(element: FocusableElement): void {
    if (element.id.startsWith('vt-input')) {
      this.lastInputId.set(element.id);
    }
    this.focusables.update((list) => {
      const newList = [...list, element].sort((a, b) => a.priority - b.priority);
      if (this.focusedId() === null && element === newList[0]) {
        this.focusedId.set(element.id);
        element.onFocus();
      }
      return newList;
    });
  }

  /** Focus the last registered input element, or the first focusable. */
  focusInput(): void {
    const inputId = this.lastInputId();
    if (inputId) {
      this.focus(inputId);
    } else if (this.focusables().length > 0) {
      this.focus(this.focusables()[0].id);
    }
  }

  /** Unregister a focusable element by ID. */
  unregister(id: string): void {
    this.focusables.update((list) => list.filter((f) => f.id !== id));
    if (this.focusedId() === id) {
      this.focusedId.set(null);
    }
  }

  /** Move focus to the next element (wraps around). */
  next(): void {
    const list = this.focusables();
    if (list.length === 0) return;

    const current = this.focused();
    if (current) current.onBlur();

    const nextIndex = (this.focusedIndex() + 1) % list.length;

    const next = list[nextIndex];
    this.focusedId.set(next.id);
    next.onFocus();
  }

  /** Move focus to the previous element (wraps around). */
  previous(): void {
    const list = this.focusables();
    if (list.length === 0) return;

    const current = this.focused();
    if (current) current.onBlur();

    const prevIndex =
      (this.focusedIndex() - 1 + list.length) % list.length;

    const prev = list[prevIndex];
    this.focusedId.set(prev.id);
    prev.onFocus();
  }

  /** Move focus to a specific element by ID. */
  focus(id: string): void {
    const list = this.focusables();
    const element = list.find((f) => f.id === id);
    if (!element) return;

    const current = this.focused();
    if (current) current.onBlur();

    this.focusedId.set(element.id);
    element.onFocus();
  }
}
