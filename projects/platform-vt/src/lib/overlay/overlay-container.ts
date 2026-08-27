import { DestroyRef, Injectable, inject } from '@angular/core';
import { RenderService } from '../services/render.service';
import { TerminalService } from '../services/terminal.service';

/**
 * Owns the DOM layer that overlay panels are mounted into.
 *
 * The container is appended as the last child of `#vt-root`, so the render
 * service paints it as a layer on top of the application (terminal z-order =
 * paint order). It is explicitly sized to the full terminal viewport
 * (`width`/`height` attributes kept in sync with `TerminalService`), so
 * absolutely positioned panels inside it are clamped against the real screen
 * bounds instead of a 0×0 content box. Panels use `position: absolute` and
 * are placed at explicit `left`/`top` coordinates.
 */
@Injectable()
export class OverlayContainer {
  private readonly terminal = inject(TerminalService);
  private readonly renderService = inject(RenderService);
  private readonly destroyRef = inject(DestroyRef);

  private container: HTMLElement | null = null;
  private unregisterResize: (() => void) | null = null;

  /** The overlay layer element, created lazily on first access. */
  getContainerElement(): HTMLElement {
    if (this.container) return this.container;

    let rootEl = document.getElementById('vt-root');
    if (!rootEl) {
      rootEl = document.createElement('app-root');
      rootEl.id = 'vt-root';
      document.body.appendChild(rootEl);
    }

    const container = document.createElement('vt-overlay-container');
    container.setAttribute('display', 'flex');
    container.setAttribute('flex-direction', 'column');
    container.setAttribute('position', 'absolute');
    container.setAttribute('left', '0');
    container.setAttribute('top', '0');
    this.applyViewportSize(container);
    rootEl.appendChild(container);

    // Keep the layer sized to the viewport: absolute children are clamped to
    // the container's content box, so a stale size would clamp panels wrong.
    this.unregisterResize = this.terminal.onResize(() => {
      this.applyViewportSize(container);
      this.renderService.scheduleRender();
    });

    this.destroyRef.onDestroy(() => {
      this.unregisterResize?.();
      this.unregisterResize = null;
    });

    this.container = container;
    return container;
  }

  private applyViewportSize(container: HTMLElement): void {
    const columns = this.terminal.columns();
    const rows = this.terminal.rows();
    container.setAttribute('width', String(columns));
    container.setAttribute('height', String(rows));
  }

  /**
   * Create a panel element inside the overlay layer.
   *
   * A panel is an absolutely positioned flex container; overlay content is
   * mounted directly onto it (see `OverlayRef.attach`).
   */
  createPanel(): HTMLElement {
    const panel = document.createElement('vt-overlay-panel');
    panel.setAttribute('display', 'flex');
    panel.setAttribute('flex-direction', 'column');
    panel.setAttribute('position', 'absolute');
    panel.setAttribute('left', '0');
    panel.setAttribute('top', '0');
    this.getContainerElement().appendChild(panel);
    return panel;
  }

  /**
   * Move a panel to the end of the overlay layer so it paints on top of all
   * other panels (terminal z-order = paint order).
   */
  bringToFront(panel: HTMLElement): void {
    const container = this.getContainerElement();
    if (panel.parentElement === container && container.lastElementChild !== panel) {
      container.appendChild(panel);
    }
  }
}