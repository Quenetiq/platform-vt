import {
  createComponent,
  inputBinding,
  type ApplicationRef,
  type ComponentRef,
  type EnvironmentInjector,
  type Type,
} from '@angular/core';
import { signal } from '@angular/core';
import type { Subscription } from 'rxjs';
import { filter } from 'rxjs';
import type { LayoutRect } from '../renderer/vt-node';
import type { RenderService } from '../services/render.service';
import type { TerminalService } from '../services/terminal.service';
import type { InputService } from '../services/input.service';
import type { MouseService } from '../services/mouse.service';
import {
  computeOverlayPosition,
  type OverlayAnchor,
  type OverlayPlacement,
} from './overlay-position';
import type { OverlayContainer } from './overlay-container';

/** Behavior options for an overlay panel. */
export interface OverlayOptions {
  /** Dispose the overlay when the user presses Esc. */
  closeOnEscape?: boolean;
  /** Dispose the overlay when the user clicks outside its bounds. */
  closeOnOutsideClick?: boolean;
}

/**
 * A handle to a single overlay panel.
 *
 * Created via {@link OverlayService.create}. Use {@link attach} to mount a
 * component onto the panel, {@link setPosition} / {@link setPositionFromRect}
 * to move it, and {@link detach} / {@link dispose} to tear it down.
 *
 * Positioning is Ink-style: the panel is repositioned after every render
 * pass using its own measured size, so it never overlaps its anchor and
 * never overflows the terminal (placements flip and clamp at viewport
 * edges, and the anchor rect is re-resolved on terminal resize).
 */
export class OverlayRef {
  /** The DOM element that hosts the attached component. */
  readonly hostElement: HTMLElement;

  /** Whether the overlay has been disposed. */
  readonly disposed = signal(false);

  private componentRef: ComponentRef<unknown> | null = null;
  private anchor: OverlayAnchor | null = null;
  private fixed: { x: number; y: number } | null = null;
  private readonly unregisterFlush: () => void;
  private readonly subscriptions: Subscription[] = [];

  constructor(
    hostElement: HTMLElement,
    private readonly renderService: RenderService,
    private readonly terminal: TerminalService,
    private readonly appRef: ApplicationRef,
    private readonly environmentInjector: EnvironmentInjector,
    private readonly container: OverlayContainer,
    private readonly input: InputService | null,
    private readonly mouse: MouseService | null,
    options: OverlayOptions = {},
  ) {
    this.hostElement = hostElement;
    this.unregisterFlush = renderService.onFlush(() => this.applyPosition());

    if (options.closeOnEscape && input) {
      this.subscriptions.push(
        input.keyEvents
          .pipe(filter((event) => event.name === 'escape'))
          .subscribe(() => this.dispose()),
      );
    }

    if (options.closeOnOutsideClick && mouse) {
      this.subscriptions.push(
        mouse.clicks
          .pipe(filter((click) => !this.isInsidePanel(click.x, click.y)))
          .subscribe(() => this.dispose()),
      );
    }
  }

  /** Whether a component is currently attached to this overlay. */
  hasAttached(): boolean {
    return this.componentRef !== null;
  }

  /**
   * Mount a component onto the overlay panel.
   *
   * The component is created with its own host element (Angular's standard
   * dynamic-component path — `createComponent` with a pre-existing
   * `hostElement` does not render nested elements correctly in this
   * environment) and the host is moved into the panel. The ref is registered
   * with the application so change detection picks it up.
   *
   * `inputs` are applied at creation time, before the first change detection
   * pass — required inputs (`input.required()`) must be supplied here.
   *
   * @throws {Error} If the overlay is disposed or already has content attached.
   */
  attach<C>(component: Type<C>, inputs?: Record<string, unknown>): ComponentRef<C> {
    if (this.disposed()) {
      throw new Error('Cannot attach to a disposed overlay');
    }
    if (this.componentRef) {
      throw new Error('Overlay already has content attached');
    }

    const ref = createComponent(component, {
      environmentInjector: this.environmentInjector,
      bindings: inputs
        ? Object.entries(inputs).map(([name, value]) => inputBinding(name, () => value))
        : undefined,
    });
    this.appRef.attachView(ref.hostView);
    ref.changeDetectorRef.detectChanges();
    this.hostElement.appendChild(ref.location.nativeElement as Node);
    this.componentRef = ref;
    this.renderService.scheduleRender();
    return ref;
  }

  /**
   * Move the overlay to a fixed position (columns, rows).
   *
   * The position is clamped to the terminal viewport after the panel's size
   * is known. Use {@link setPositionFromRect} for anchored placement.
   */
  setPosition(x: number, y: number): void {
    this.fixed = { x, y };
    this.anchor = null;
    this.renderService.scheduleRender();
  }

  /**
   * Place the overlay next to a layout rectangle.
   *
   * The rectangle can be given as a value or as a lazy resolver function;
   * the resolver form keeps the overlay anchored when the element moves or
   * the terminal resizes.
   *
   * @param rect - Anchor rectangle (usually from
   * `RenderService.getElementRect`), or a function resolving it.
   * @param placement - Where to put the overlay relative to the anchor:
   * `'bottom'` (below the anchor), `'top'`, `'right'` or `'left'`. Flips to
   * the opposite side when the panel would overflow the viewport edge.
   * @param offsetX - Horizontal offset in columns, applied after placement.
   * @param offsetY - Vertical offset in rows, applied after placement.
   */
  setPositionFromRect(
    rect: LayoutRect | (() => LayoutRect | null),
    placement: OverlayPlacement = 'bottom',
    offsetX = 0,
    offsetY = 0,
  ): void {
    const resolve: () => LayoutRect | null = typeof rect === 'function' ? rect : (): LayoutRect => rect;
    this.anchor = { rect: resolve, placement, offsetX, offsetY };
    this.fixed = null;
    this.renderService.scheduleRender();
  }

  /**
   * Move the overlay to the top of the z-order.
   *
   * Overlays paint in DOM order (creation order); bringing a panel to the
   * front re-appends it so it paints above all other overlays.
   */
  bringToFront(): void {
    if (this.disposed()) return;
    this.container.bringToFront(this.hostElement);
    this.renderService.scheduleRender();
  }

  /**
   * Remove the attached component, keeping the panel for reuse.
   */
  detach(): void {
    const ref = this.componentRef;
    if (!ref) return;
    this.componentRef = null;
    this.appRef.detachView(ref.hostView);
    ref.destroy();
    this.renderService.scheduleRender();
  }

  /**
   * Detach content and remove the panel from the overlay layer.
   */
  dispose(): void {
    if (this.disposed()) return;
    this.disposed.set(true);
    this.unregisterFlush();
    for (const subscription of this.subscriptions) subscription.unsubscribe();
    this.detach();
    this.hostElement.remove();
    this.renderService.scheduleRender();
  }

  /** Reposition the panel using the measured size from the last render. */
  private applyPosition(): void {
    if (this.disposed() || this.hostElement.parentElement === null) return;

    const rect = this.renderService.getElementRect(this.hostElement);
    const target = this.computeTarget(rect?.width ?? 0, rect?.height ?? 0);
    if (!target) return;

    const left = String(target.x);
    const top = String(target.y);
    if (this.hostElement.getAttribute('left') === left && this.hostElement.getAttribute('top') === top) {
      return;
    }

    this.hostElement.setAttribute('left', left);
    this.hostElement.setAttribute('top', top);
    this.renderService.scheduleRender();
  }

  private computeTarget(width: number, height: number): { x: number; y: number } | null {
    const columns = this.terminal.columns();
    const rows = this.terminal.rows();

    if (this.anchor) {
      return computeOverlayPosition(this.anchor, { width, height, columns, rows });
    }
    if (!this.fixed) return null;

    const maxX = columns - width;
    const maxY = rows - height;
    return {
      x: Math.min(Math.max(Math.floor(this.fixed.x), 0), maxX > 0 ? maxX : 0),
      y: Math.min(Math.max(Math.floor(this.fixed.y), 0), maxY > 0 ? maxY : 0),
    };
  }

  private isInsidePanel(x: number, y: number): boolean {
    const rect = this.renderService.getElementRect(this.hostElement);
    if (!rect) return false;
    return x >= rect.x && x < rect.x + rect.width && y >= rect.y && y < rect.y + rect.height;
  }
}