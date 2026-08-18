import { Injectable } from '@angular/core';

/**
 * Owns the DOM layer that overlay panels are mounted into.
 *
 * The container is appended as the last child of `#vt-root`, so the render
 * service paints it as a layer on top of the application (terminal z-order =
 * paint order). Panels inside it use `position: absolute` and are placed at
 * explicit `left`/`top` coordinates.
 */
@Injectable()
export class OverlayContainer {
  private container: HTMLElement | null = null;

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
    rootEl.appendChild(container);

    this.container = container;
    return container;
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
}
