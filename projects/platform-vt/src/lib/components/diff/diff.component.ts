import { Component, effect, ElementRef, inject, input } from '@angular/core';
import { RenderService } from '../../services/render.service';
import { diffLines } from '../../utils/diff';
import { LINE_ATTRS, setCellText, syncChildren } from '../../cdk/dom';

/**
 * Renders a line-based diff of two texts.
 *
 * Unchanged lines keep the default color, added lines are prefixed with `+`
 * and colored green, removed lines with `-` and colored red.
 *
 * @example
 * ```html
 * <vt-diff [oldText]="previous()" [newText]="current()"></vt-diff>
 * ```
 */
@Component({
  selector: 'vt-diff',
  template: '',
})
export class DiffComponent {
  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly renderService = inject(RenderService);

  /** The original text. */
  readonly oldText = input.required<string>();
  /** The changed text. */
  readonly newText = input.required<string>();
  /** Color for added lines. */
  readonly addColor = input<string>('green');
  /** Color for removed lines. */
  readonly delColor = input<string>('red');
  /** Color for unchanged lines (default terminal color when empty). */
  readonly sameColor = input<string>('');

  constructor() {
    effect(() => {
      const el = this.elementRef.nativeElement as HTMLElement;
      const lines = diffLines(this.oldText(), this.newText());
      const addColor = this.addColor();
      const delColor = this.delColor();
      const sameColor = this.sameColor();

      el.setAttribute('display', 'flex');
      el.setAttribute('flex-direction', 'column');
      el.setAttribute('flex-shrink', '0');

      const rows = syncChildren(el, lines.length, 'vt-diff-line', LINE_ATTRS);

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]!;
        const row = rows[i]!;
        const prefix = line.type === 'add' ? '+' : line.type === 'del' ? '-' : ' ';
        const color = line.type === 'add' ? addColor : line.type === 'del' ? delColor : sameColor;
        setCellText(row, `${prefix} ${line.text}`);
        row.setAttribute('color', color);
      }
      this.renderService.scheduleRender();
    });
  }
}
