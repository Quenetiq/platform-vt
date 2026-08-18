import {
  createComponent,
  inputBinding,
  type ApplicationRef,
  type ComponentRef,
  type EnvironmentInjector,
  type Type,
} from '@angular/core';
import type { LayoutRect } from '../renderer/vt-node';
import type { RenderService } from '../services/render.service';

/**
 * A handle to a single overlay panel.
 *
 * Created via {@link OverlayService.create}. Use {@link attach} to mount a
 * component onto the panel, {@link setPosition} / {@link setPositionFromRect}
 * to move it, and {@link detach} / {@link dispose} to tear it down.
 */
export class OverlayRef {
  /** The DOM element that hosts the attached component. */
  readonly hostElement: HTMLElement;

  private componentRef: ComponentRef<unknown> | null = null;
  private disposed = false;

  constructor(
    hostElement: HTMLElement,
    private readonly renderService: RenderService,
    private readonly appRef: ApplicationRef,
    private readonly environmentInjector: EnvironmentInjector,
  ) {
    this.hostElement = hostElement;
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
    if (this.disposed) {
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
   * Move the overlay to an absolute position (columns, rows).
   */
  setPosition(x: number, y: number): void {
    this.hostElement.setAttribute('left', String(Math.floor(x)));
    this.hostElement.setAttribute('top', String(Math.floor(y)));
    this.renderService.scheduleRender();
  }

  /**
   * Place the overlay next to a layout rectangle.
   *
   * @param rect - Anchor rectangle (usually from
   * `RenderService.getElementRect`).
   * @param offsetX - Horizontal offset in columns, applied after placement.
   * @param offsetY - Vertical offset in rows, applied after placement.
   * @param placement - Where to put the overlay relative to the anchor:
   * `'bottom'` (below the anchor), `'top'`, `'right'` or `'left'`.
   */
  setPositionFromRect(rect: LayoutRect, placement: 'bottom' | 'top' | 'right' | 'left' = 'bottom', offsetX = 0, offsetY = 0): void {
    let x: number;
    let y: number;
    switch (placement) {
      case 'bottom':
        x = rect.x + offsetX;
        y = rect.y + rect.height + offsetY;
        break;
      case 'top':
        x = rect.x + offsetX;
        y = rect.y - offsetY;
        break;
      case 'right':
        x = rect.x + rect.width + offsetX;
        y = rect.y + offsetY;
        break;
      case 'left':
        x = rect.x - offsetX;
        y = rect.y + offsetY;
        break;
    }
    this.setPosition(x, y);
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
    if (this.disposed) return;
    this.disposed = true;
    this.detach();
    this.hostElement.remove();
    this.renderService.scheduleRender();
  }
}
