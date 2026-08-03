import { Component, input, computed, inject, effect, ElementRef } from '@angular/core';
import type { VTNode } from '../../renderer/vt-node';
import { RenderService } from '../../services/render.service';
import { STYLE_READER, type VTStyleReader } from '../../styles/style-registry';

@Component({
  selector: 'vt-progress',
  template: '',
})
export class ProgressComponent {
  private readonly elementRef = inject(ElementRef);
  private readonly renderService = inject(RenderService);
  private readonly styleReader = inject(STYLE_READER) as VTStyleReader;

  readonly value = input<number>(0);
  readonly max = input<number>(100);
  readonly label = input<string>('');
  readonly showPercent = input<boolean>(true);
  readonly width = input<number>(30);

  readonly percent = computed(() => {
    const val = this.value();
    const mx = this.max();
    return mx > 0 ? Math.round((val / mx) * 100) : 0;
  });

  constructor() {
    effect(() => {
      const node = this.elementRef.nativeElement as VTNode;
      if (node.type !== 'element') return;
      const pct = this.percent();
      const themed = this.styleReader.get('vt-progress');
      const themedWidth = Number(themed['width'] ?? this.width());
      const barWidth = themedWidth > 0 ? themedWidth : 1;
      const fill = Math.round((pct / 100) * barWidth);
      const bar = '\u2588'.repeat(fill) + '\u2591'.repeat(Math.max(0, barWidth - fill));
      const pctText = this.showPercent() ? ` ${String(pct)}%` : '';
      node.textContent = `${this.label()}${this.label() ? ' ' : ''}[${bar}]${pctText}`;
      node.styles.set('minHeight', 1);
      const themedColor = themed['color'] ?? '';
      node.styles.set('color', pct >= 100 ? 'green' : pct > 50 ? 'yellow' : String(themedColor));
      node.dirty = true;
      this.renderService.scheduleRender();
    });
  }
}
