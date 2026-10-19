import {
  DestroyRef,
  Injectable,
  NgZone,
  inject,
  makeEnvironmentProviders,
  signal,
  type EnvironmentProviders,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import type { VTMouseEvent } from './sgr-mouse';
import { MouseService } from './mouse.service';
import { RenderService } from './render.service';

/** Attribute set on hoverable host elements so the layout tree can be matched back. */
const HOVER_ID_ATTR = 'vt-hover-id';

/**
 * A component or directive that opted into receiving hover events.
 */
export interface HoverableElement {
  /** Unique identifier for this hoverable. */
  id: string;
  /** The host element; tagged for hit-testing. */
  element: Element;
  /** Called when the mouse enters the element (or one of its children). */
  onHoverEnter?: (event: VTMouseEvent) => void;
  /** Called when the mouse leaves the element. */
  onHoverLeave?: () => void;
}

/**
 * Dispatches terminal mouse hover events to registered elements.
 *
 * Tracks the element under the terminal cursor and fires `enter`/`leave`
 * callbacks when it changes. The hit-test bubbles up the DOM: hovering a
 * child of a registered hoverable counts as hovering the hoverable itself,
 * and no events fire while the cursor moves between the two.
 *
 * Requires all-motion tracking (`?1003`), which {@link MouseService.enable}
 * turns on, so hover works without holding a button.
 *
 * @example
 * ```typescript
 * const hover = inject(HoverService);
 * hover.register({
 *   id: 'list-row-3',
 *   element: rowElement,
 *   onHoverEnter: () => console.log('row highlighted'),
 *   onHoverLeave: () => console.log('row normal'),
 * });
 * ```
 */
@Injectable()
export class HoverService {
  private readonly mouse = inject(MouseService);
  private readonly render = inject(RenderService);
  private readonly ngZone = inject(NgZone);
  private readonly destroyRef = inject(DestroyRef);

  /** All registered hoverable elements by ID. */
  private readonly hoverables = new Map<string, HoverableElement>();

  /** The currently hovered element ID, or null. */
  private currentId: string | null = null;

  /** The most recent mouse position, used to re-evaluate on render flushes. */
  private lastPosition: { x: number; y: number } | null = null;

  /** Signal holding the ID of the currently hovered element (reactive styling). */
  readonly hoveredId = signal<string | null>(null);

  constructor() {
    this.mouse.enable();

    this.mouse.mouseEvents
      .pipe(
        filter((event) => event.type === 'move' || event.type === 'up'),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((event) => {
        this.ngZone.run(() => this.dispatch(event.x, event.y));
      });

    // Content can scroll under a stationary cursor (list updates, overlays
    // appearing); re-evaluate the hover state after every render pass.
    this.render.onFlush(() => {
      const position = this.lastPosition;
      if (position) {
        this.ngZone.run(() => this.dispatch(position.x, position.y));
      }
    });
  }

  /** Register a hoverable element. */
  register(hoverable: HoverableElement): void {
    hoverable.element.setAttribute(HOVER_ID_ATTR, hoverable.id);
    this.hoverables.set(hoverable.id, hoverable);
  }

  /** Unregister a hoverable element by ID; leaves it if it was hovered. */
  unregister(id: string): void {
    this.hoverables.delete(id);
    if (this.currentId === id) {
      this.leave();
    }
  }

  /** Force a re-evaluation of the hover state at the last known cursor position. */
  refresh(): void {
    const position = this.lastPosition;
    if (position) {
      this.ngZone.run(() => this.dispatch(position.x, position.y));
    }
  }

  private dispatch(x: number, y: number): void {
    this.lastPosition = { x, y };

    const target = this.render.getElementAtPoint(x, y);

    // Walk up from the deepest element under the cursor to the nearest
    // registered hoverable (bubbling, like DOM mouseenter/leave).
    let id: string | null = null;
    let el: Element | null = target;
    while (el) {
      const candidate = el.getAttribute(HOVER_ID_ATTR);
      if (candidate && this.hoverables.has(candidate)) {
        id = candidate;
        break;
      }
      el = el.parentElement;
    }

    if (id === this.currentId) return;
    this.leave();
    this.enter(id);
  }

  private enter(id: string | null): void {
    this.currentId = id;
    this.hoveredId.set(id);
    if (id !== null) {
      this.hoverables.get(id)?.onHoverEnter?.(this.lastPositionToEvent());
    }
  }

  private leave(): void {
    const previous = this.currentId;
    this.currentId = null;
    this.hoveredId.set(null);
    if (previous !== null) {
      this.hoverables.get(previous)?.onHoverLeave?.();
    }
  }

  private lastPositionToEvent(): VTMouseEvent {
    const position = this.lastPosition ?? { x: 0, y: 0 };
    return {
      x: position.x,
      y: position.y,
      type: 'move',
      button: 'none',
      shift: false,
      meta: false,
      ctrl: false,
      raw: '',
    };
  }
}

/**
 * Provide the hover handling services.
 *
 * Mouse reporting is only enabled once a component actually injects
 * {@link HoverService}, so apps that never use hover are unaffected.
 */
export function provideHoverService(): EnvironmentProviders {
  return makeEnvironmentProviders([MouseService, HoverService]);
}
