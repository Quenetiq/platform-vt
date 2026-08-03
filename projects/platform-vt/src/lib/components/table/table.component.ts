import { Component, input, inject, effect, ElementRef } from '@angular/core';
import type { VTNode } from '../../renderer/vt-node';
import { RenderService } from '../../services/render.service';

@Component({
  selector: 'vt-table',
  template: '',
})
export class TableComponent {
  private readonly elementRef = inject(ElementRef);
  private readonly renderService = inject(RenderService);

  readonly columns = input.required<string[]>();
  readonly rows = input.required<string[][]>();
  readonly border = input<boolean>(true);

  constructor() {
    effect(() => {
      const node = this.elementRef.nativeElement as VTNode;
      if (node.type !== 'element') return;
      const cols = this.columns();
      const data = this.rows();
      const showBorder = this.border();

      const colWidths = cols.map((col, i) => {
        const maxData = Math.max(...data.map((r) => (r[i] ?? '').length));
        return Math.max(col.length, maxData) + 2;
      });

      const lines: string[] = [];

      const hSep = '\u2500'.repeat(colWidths.reduce((a, b) => a + b + 3, -1));

      if (showBorder) {
        lines.push('\u250C' + hSep + '\u2510');
      }

      const header = cols
        .map((col, i) => ' ' + col.padEnd(colWidths[i] - 1))
        .join('\u2502');
      lines.push((showBorder ? '\u2502 ' : '') + header + (showBorder ? ' \u2502' : ''));

      if (showBorder) {
        lines.push('\u251C' + hSep + '\u2524');
      }

      for (let ri = 0; ri < data.length; ri++) {
        const row = data[ri].map((cell, i) => {
          const w = colWidths[i] ?? 0;
          return ' ' + cell.padEnd(w - 1);
        });
        lines.push(
          (showBorder ? '\u2502 ' : '') + row.join('\u2502') + (showBorder ? ' \u2502' : ''),
        );
      }

      if (showBorder) {
        lines.push('\u2514' + hSep + '\u2518');
      }

      node.styles.set('minHeight', lines.length);
      node.textContent = lines.join('\n');
      node.dirty = true;
      this.renderService.scheduleRender();
    });
  }
}
