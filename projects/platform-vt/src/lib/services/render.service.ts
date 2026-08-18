import { Injectable, inject, signal, makeEnvironmentProviders, afterNextRender, Injector, type EnvironmentProviders } from '@angular/core';
import { FlexLayout } from '../layout/flex-layout';
import type { LayoutNode } from '../layout/layout-node';
import type { LayoutRect } from '../renderer/vt-node';
import { TerminalOutput } from '../output/terminal-output';
import { TerminalService } from './terminal.service';

@Injectable()
export class RenderService {
  private readonly terminal = inject(TerminalService);
  private readonly injector = inject(Injector);
  private readonly layout = new FlexLayout();
  private readonly output = new TerminalOutput();

  readonly renderCount = signal(0);
  readonly lastRenderTime = signal(0);

  /**
   * The layout trees from the most recent render, one per layer.
   *
   * Layers are the children of `#vt-root`. The first layer is the main
   * application; later layers (e.g. the overlay container) paint over it.
   */
  private layerLayouts: LayoutNode[] = [];

  private renderScheduled = false;

  scheduleRender(): void {
    if (this.renderScheduled) return;
    this.renderScheduled = true;

    // Flush only after Angular finishes its change detection pass for the
    // current tick, so the DOM reflects the latest signal-driven state.
    afterNextRender(() => {
      if (this.renderScheduled) this.flush();
    }, { injector: this.injector });

    // Safety net for calls made outside a change-detection cycle (e.g. resize):
    // if no CD pass runs, the afterNextRender hook would never fire.
    setTimeout(() => {
      if (this.renderScheduled) this.flush();
    }, 50);
  }

  flush(): void {
    this.renderScheduled = false;

    const columns = this.terminal.columns();
    const rows = this.terminal.rows();

    const rootEl = document.getElementById('vt-root');
    if (!rootEl) return;

    // Each child of #vt-root is a layer: the first is the application itself,
    // later layers (overlays) paint on top without clearing the screen.
    const layers: LayoutNode[] = [];
    for (let i = 0; i < rootEl.children.length; i++) {
      const layerRoot = rootEl.children[i];
      const layoutTree = this.layout.calculateFromDom(layerRoot, columns, rows);
      layers.push(layoutTree);
      this.output.render(layoutTree, columns, rows, { clear: i === 0 });
    }
    this.layerLayouts = layers;

    this.renderCount.update((c) => c + 1);
    this.lastRenderTime.set(Date.now());
  }

  /** The layout tree from the last render, or null before the first render. */
  get lastLayout(): LayoutNode | null {
    return this.layerLayouts[0] ?? null;
  }

  /**
   * Find an element's layout rectangle (columns/rows) in the last render.
   *
   * Walks from the element up to its layer root to determine the layer, then
   * descends the layout tree by DOM child indices. Returns `null` when the
   * element is not part of the rendered tree (e.g. never laid out).
   *
   * @param element - A DOM element inside one of the rendered layers.
   * @returns The element's rectangle, or null.
   */
  getElementRect(element: Element): LayoutRect | null {
    const rootEl = document.getElementById('vt-root');
    if (!rootEl || this.layerLayouts.length === 0) return null;

    // Walk up to the layer root (a direct child of #vt-root).
    let layerEl = element;
    while (layerEl.parentElement && layerEl.parentElement !== rootEl) {
      layerEl = layerEl.parentElement;
    }
    if (!layerEl.parentElement || layerEl.parentElement !== rootEl) return null;

    const layerIndex = Array.prototype.indexOf.call(rootEl.children, layerEl);
    if (layerIndex < 0 || layerIndex >= this.layerLayouts.length) return null;

    // Descend the layout tree mirroring the DOM structure by child indices.
    let node: LayoutNode = this.layerLayouts[layerIndex]!;
    let current = element;
    while (current !== layerEl && current.parentElement) {
      const index = Array.prototype.indexOf.call(current.parentElement.children, current);
      if (index < 0 || index >= node.children.length) return null;
      node = node.children[index]!;
      current = current.parentElement;
    }
    if (current !== layerEl) return null;

    return { x: node.x, y: node.y, width: node.width, height: node.height };
  }

  /**
   * Find the topmost rendered element under a terminal point (hover hit-test).
   *
   * Layers are checked from the top down; within a layer the deepest child
   * containing the point wins (later children paint on top of earlier ones).
   * Empty layers (e.g. an overlay container with no panel under the cursor)
   * are skipped so the content below shows through.
   *
   * @param x - Column (0-based).
   * @param y - Row (0-based).
   * @returns The DOM element under the point, or null.
   */
  getElementAtPoint(x: number, y: number): Element | null {
    const rootEl = document.getElementById('vt-root');
    if (!rootEl || this.layerLayouts.length === 0) return null;

    for (let layerIndex = this.layerLayouts.length - 1; layerIndex >= 0; layerIndex--) {
      const hit = this.hitTestNode(this.layerLayouts[layerIndex]!, x, y);
      if (!hit) continue;
      // Skip layers whose topmost hit paints nothing under the cursor (e.g.
      // the empty part of an overlay layer); the layer below shows through.
      if (!this.isPaintedNode(hit.node)) continue;

      const layerRoot = rootEl.children[layerIndex];
      if (!layerRoot) continue;
      const element = this.resolveElement(layerRoot, hit.path);
      if (element) return element;
    }
    return null;
  }

  /** The deepest layout node containing the point, plus its child-index path. */
  private hitTestNode(
    node: LayoutNode,
    x: number,
    y: number,
    path: number[] = [],
  ): { node: LayoutNode; path: number[] } | null {
    if (x < node.x || x >= node.x + node.width || y < node.y || y >= node.y + node.height) {
      return null;
    }

    for (let i = node.children.length - 1; i >= 0; i--) {
      const child = node.children[i]!;
      const hit = this.hitTestNode(child, x, y, [...path, i]);
      if (hit) return hit;
    }

    return { node, path };
  }

  /** Whether a node paints anything under the cursor (text, bg, or border). */
  private isPaintedNode(node: LayoutNode): boolean {
    const styles = node.vtNode.styles;
    const bg = styles.get('backgroundColor');
    const border = styles.get('border');
    return (
      node.vtNode.textContent.length > 0 ||
      (typeof bg === 'string' && bg.length > 0 && bg !== 'none') ||
      (typeof border === 'string' && border.length > 0)
    );
  }

  /** Map a child-index path back to the matching DOM element under a layer root. */
  private resolveElement(layerRoot: Element, path: number[]): Element | null {
    let element: Element = layerRoot;
    for (const index of path) {
      const child = element.children[index];
      if (!child) return null;
      element = child;
    }
    return element;
  }
}

export function provideRenderService(): EnvironmentProviders {
  return makeEnvironmentProviders([RenderService]);
}
