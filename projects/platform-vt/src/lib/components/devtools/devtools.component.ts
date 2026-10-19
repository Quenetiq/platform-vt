import { Component, ElementRef, effect, inject } from '@angular/core';
import { RenderService } from '../../services/render.service';
import { TerminalService } from '../../services/terminal.service';
import { FocusService } from '../../services/focus.service';
import { BreakpointService } from '../../services/breakpoint.service';
import type { LayoutNode } from '../../layout/layout-node';

/**
 * The debug overlay shown by {@link DevtoolsService}.
 *
 * Displays terminal size, render count/frame time, layout tree size, the
 * focused element and the active breakpoint. Toggle with `Ctrl+Shift+D`.
 */
@Component({
  selector: 'vt-devtools',
  template: '',
})
export class DevtoolsComponent {
  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly render = inject(RenderService);
  private readonly terminal = inject(TerminalService);
  private readonly focus = inject(FocusService);
  private readonly breakpoints = inject(BreakpointService, { optional: true });

  constructor() {
    effect(() => {
      const el = this.elementRef.nativeElement;
      const layout = this.render.lastLayout;
      const stats = layout ? this.layoutStats(layout) : { nodes: 0, depth: 0 };
      const breakpoint = this.breakpoints?.breakpoint() ?? '-';
      const lines = [
        'VT DevTools',
        `size      ${String(this.terminal.columns())}x${String(this.terminal.rows())}`,
        `renders   ${String(this.render.renderCount())}`,
        `frame     ${this.render.lastRenderDuration().toFixed(2)}ms`,
        `layout    ${String(stats.nodes)} nodes / depth ${String(stats.depth)}`,
        `focus     ${this.focus.focused()?.id ?? '-'}`,
        `overlays  ${String(document.querySelectorAll('vt-overlay-panel').length)}`,
        `width     ${breakpoint}`,
        '',
        'Ctrl+Shift+D to close',
      ];
      const text = lines.join('\n');
      el.setAttribute('display', 'flex');
      el.setAttribute('flex-direction', 'column');
      el.setAttribute('flex-shrink', '0');
      el.setAttribute('border', 'round');
      el.setAttribute('padding', '1');
      el.setAttribute('background-color', 'black');
      el.setAttribute('color', 'bright-cyan');
      el.setAttribute('content', text);
      el.textContent = text;
      this.render.scheduleRender();
    });
  }

  private layoutStats(node: LayoutNode): { nodes: number; depth: number } {
    let nodes = 0;
    let depth = 0;
    const walk = (current: LayoutNode, level: number): void => {
      nodes++;
      depth = Math.max(depth, level);
      for (const child of current.children) walk(child, level + 1);
    };
    walk(node, 1);
    return { nodes, depth };
  }
}
