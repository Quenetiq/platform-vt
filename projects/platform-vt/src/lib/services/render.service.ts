import { Injectable, inject, signal, makeEnvironmentProviders, afterNextRender, Injector, type EnvironmentProviders } from '@angular/core';
import { FlexLayout } from '../layout/flex-layout';
import type { LayoutNode } from '../layout/layout-node';
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

  /** The layout tree from the most recent render, used for click hit-testing. */
  private lastLayoutNode: LayoutNode | null = null;

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

    // Use the first child (vt-box) as the real layout root
    // to avoid app-root host element distortion
    const layoutRoot = rootEl.children[0] ?? rootEl;
    const layoutTree = this.layout.calculateFromDom(layoutRoot, columns, rows);
    this.lastLayoutNode = layoutTree;
    this.output.render(layoutTree, columns, rows);

    this.renderCount.update((c) => c + 1);
    this.lastRenderTime.set(Date.now());
  }

  /** The layout tree from the last render, or null before the first render. */
  get lastLayout(): LayoutNode | null {
    return this.lastLayoutNode;
  }
}

export function provideRenderService(): EnvironmentProviders {
  return makeEnvironmentProviders([RenderService]);
}
