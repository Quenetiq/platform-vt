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
  /** The host element; enables focus traps and DOM-scoped navigation. */
  element?: Element;
}

/**
 * Manages keyboard focus navigation across interactive terminal components.
 *
 * Handles Tab (next) and Shift+Tab (previous) navigation. Components
 * register/unregister themselves as focusable elements.
 *
 * ## Focus traps
 *
 * Modal overlays (dialogs) call {@link setFocusTrap} with their panel
 * element: while the trap is active, Tab/Shift+Tab only cycle through the
 * focusables inside the panel, and {@link focus} refuses elements outside it.
 *
 * @example
 * ```typescript
 * const focus = inject(FocusService);
 * focus.next();      // move focus to next element
 * focus.previous();  // move focus to previous element
 * focus.focus('my-input-id');  // focus a specific element
 * focus.setFocusTrap(panelElement);  // restrict navigation to the panel
 * focus.setFocusTrap(null);         // release the trap
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
    return this.activeFocusables().findIndex((f) => f.id === id);
  });

  /** The currently focused element object, or null. */
  readonly focused = computed(() => {
    const id = this.focusedId();
    return this.activeFocusables().find((f) => f.id === id) ?? null;
  });

  /** Total number of registered focusable elements. */
  readonly focusCount = computed(() => this.focusables().length);

  /** The active focus trap element, or null. */
  readonly trapElement = signal<Element | null>(null);

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
    } else if (this.activeFocusables().length > 0) {
      this.focus(this.activeFocusables()[0].id);
    }
  }

  /** Unregister a focusable element by ID. */
  unregister(id: string): void {
    this.focusables.update((list) => list.filter((f) => f.id !== id));
    if (this.focusedId() === id) {
      this.focusedId.set(null);
    }
  }

  /**
   * Restrict focus navigation to elements inside a container (modal trap).
   *
   * While the trap is active, Tab/Shift+Tab and {@link focus} only consider
   * focusables whose `element` lies inside `container`. Pass `null` to
   * release the trap.
   */
  setFocusTrap(container: Element | null): void {
    this.trapElement.set(container);
    const current = this.focusedId();
    if (current && !this.activeFocusables().some((f) => f.id === current)) {
      const first = this.activeFocusables()[0];
      if (first) {
        this.focus(first.id);
      } else {
        this.focusedId.set(null);
      }
    }
  }

  /**
   * Focus the first focusable element inside a container, if any.
   *
   * @param container - The container to search.
   * @returns Whether an element was focused.
   */
  focusIn(container: Element): boolean {
    const first = this.focusables().find(
      (f) => f.element && container.contains(f.element),
    );
    if (!first) return false;
    this.focus(first.id);
    return true;
  }

  /** Focusables relevant to the current navigation scope (respects traps). */
  private activeFocusables(): FocusableElement[] {
    const trap = this.trapElement();
    if (!trap) return this.focusables();
    return this.focusables().filter((f) => f.element && trap.contains(f.element));
  }

  /** Move focus to the next element (wraps around). */
  next(): void {
    const list = this.activeFocusables();
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
    const list = this.activeFocusables();
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
    const list = this.activeFocusables();
    const element = list.find((f) => f.id === id);
    if (!element) return;

    const current = this.focused();
    if (current) current.onBlur();

    this.focusedId.set(element.id);
    element.onFocus();
  }
}
