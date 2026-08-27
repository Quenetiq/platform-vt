import { DestroyRef, Injectable, inject, makeEnvironmentProviders, NgZone, type EnvironmentProviders } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import type { VTMouseEvent } from './sgr-mouse';
import { MouseService } from './mouse.service';
import { RenderService } from './render.service';

/** Attribute set on wheelable host elements so the layout tree can be matched back. */
const WHEEL_ID_ATTR = 'vt-wheel-id';

/**
 * A component that opted into receiving wheel (scroll) events.
 */
export interface WheelableElement {
  /** Unique identifier. */
  id: string;
  /** The host element; tagged for hit-testing. */
  element: Element;
  /** Called when the wheel is used over this element or one of its children. */
  onWheel: (event: VTMouseEvent) => void;
}

/**
 * Dispatches terminal mouse wheel events to registered components.
 *
 * When the user scrolls, the event is hit-tested against the last rendered
 * layout; the deepest registered element under the cursor (or the nearest
 * registered ancestor, so scrolling over a child of a scroll view still
 * scrolls the view) receives the event.
 *
 * @example
 * ```typescript
 * const wheels = inject(WheelService);
 * wheels.register({
 *   id: 'log-view',
 *   element: elementRef.nativeElement,
 *   onWheel: (e) => this.scrollBy(e.scrollDirection === 'up' ? -1 : 1),
 * });
 * ```
 */
@Injectable()
export class WheelService {
  private readonly mouse = inject(MouseService);
  private readonly render = inject(RenderService);
  private readonly ngZone = inject(NgZone);
  private readonly destroyRef = inject(DestroyRef);

  /** All registered wheelable elements. */
  private readonly wheelables = new Map<string, WheelableElement>();

  constructor() {
    this.mouse.mouseEvents
      .pipe(
        filter((event) => event.type === 'scroll'),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((event) => {
        this.ngZone.run(() => {
          this.dispatch(event);
        });
      });
  }

  /** Register a wheelable element. */
  register(wheelable: WheelableElement): void {
    wheelable.element.setAttribute(WHEEL_ID_ATTR, wheelable.id);
    this.wheelables.set(wheelable.id, wheelable);
  }

  /** Unregister a wheelable element by ID. */
  unregister(id: string): void {
    this.wheelables.delete(id);
  }

  private dispatch(event: VTMouseEvent): void {
    const target = this.render.getElementAtPoint(event.x, event.y);
    if (!target) return;

    // Walk up from the deepest element under the cursor to the nearest
    // registered ancestor (bubbling, like DOM wheel events).
    let el: Element | null = target;
    while (el) {
      const id = el.getAttribute(WHEEL_ID_ATTR);
      if (id) {
        const wheelable = this.wheelables.get(id);
        if (wheelable) {
          wheelable.onWheel(event);
          return;
        }
      }
      el = el.parentElement;
    }
  }
}

/**
 * Provide the wheel handling service (requires {@link MouseService}).
 */
export function provideWheelService(): EnvironmentProviders {
  return makeEnvironmentProviders([WheelService]);
}