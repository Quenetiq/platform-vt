import {
  DestroyRef,
  Injectable,
  inject,
  signal,
  makeEnvironmentProviders,
  type EnvironmentProviders,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type { LayoutNode } from '../layout/layout-node';
import { FocusService } from './focus.service';
import { MouseService } from './mouse.service';
import type { VTClickEvent } from './sgr-mouse';
import { RenderService } from './render.service';

/** Attribute set on clickable host elements so the layout tree can be matched back. */
const CLICK_ID_ATTR = 'vt-click-id';

/**
 * A component or directive that opted into receiving clicks.
 */
export interface ClickableElement {
  /** Unique identifier for this clickable. */
  id: string;
  /** The host element; used to tag the element for hit-testing. */
  element: Element;
  /** Called when a click lands on this element. Receives the click and its layout node. */
  onClick: (event: VTClickEvent, node: LayoutNode) => void;
}

/**
 * Dispatches terminal mouse clicks to registered components.
 *
 * When the user clicks in the terminal, the click coordinates are hit-tested
 * against the last rendered layout tree. The deepest clickable element under
 * the cursor is focused (so keyboard navigation stays consistent) and its
 * `onClick` handler is invoked.
 *
 * Keyboard remains the fallback: components that register here usually also
 * listen to `Enter`/`Space` while focused, mirroring Ink where a "click" is
 * focus + activation.
 *
 * @example
 * ```typescript
 * const clicks = inject(ClickService);
 * clicks.register({
 *   id: 'my-button',
 *   element: elementRef.nativeElement,
 *   onClick: () => console.log('clicked!'),
 * });
 * ```
 */
@Injectable()
export class ClickService {
  private readonly mouse = inject(MouseService);
  private readonly render = inject(RenderService);
  private readonly focus = inject(FocusService);
  private readonly destroyRef = inject(DestroyRef);

  /** All registered clickable elements. */
  readonly clickables = signal<ClickableElement[]>([]);

  /** Signal holding the most recent click. */
  readonly lastClick = signal<VTClickEvent | null>(null);

  constructor() {
    this.mouse.enable();

    this.mouse.clicks
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((click) => {
        this.lastClick.set(click);
        this.dispatch(click);
      });
  }

  /** Register a clickable element. */
  register(clickable: ClickableElement): void {
    clickable.element.setAttribute(CLICK_ID_ATTR, clickable.id);
    this.clickables.update((list) => [...list, clickable]);
  }

  /** Unregister a clickable element by ID. */
  unregister(id: string): void {
    this.clickables.update((list) => list.filter((c) => c.id !== id));
  }

  private dispatch(click: VTClickEvent): void {
    const layout = this.render.lastLayout;
    if (!layout) return;

    const node = hitTestClickable(layout, click.x, click.y, CLICK_ID_ATTR);
    if (!node) return;

    const id = String(node.vtNode.styles.get(CLICK_ID_ATTR));
    const clickable = this.clickables().find((c) => c.id === id);
    if (!clickable) return;

    // Focus the target so keyboard navigation and mouse stay in sync.
    this.focus.focus(id);
    clickable.onClick(click, node);
  }
}

/**
 * Find the deepest layout node under a point that carries the given attribute.
 *
 * Children are checked before their parents, so the innermost clickable wins.
 *
 * @param node - The layout subtree to search.
 * @param x - Column (0-based).
 * @param y - Row (0-based).
 * @param attr - Attribute that marks a node as clickable.
 * @returns The matching layout node, or null.
 */
export function hitTestClickable(
  node: LayoutNode,
  x: number,
  y: number,
  attr: string,
): LayoutNode | null {
  if (x < node.x || x >= node.x + node.width || y < node.y || y >= node.y + node.height) {
    return null;
  }

  for (const child of node.children) {
    const match = hitTestClickable(child, x, y, attr);
    if (match) return match;
  }

  if (node.vtNode.styles.get(attr) !== undefined) {
    return node;
  }

  return null;
}

/**
 * Provide the click handling services.
 *
 * Mouse reporting is only enabled once a component actually injects
 * {@link ClickService}, so apps that never use clicks are unaffected.
 */
export function provideClickService(): EnvironmentProviders {
  return makeEnvironmentProviders([MouseService, ClickService]);
}
