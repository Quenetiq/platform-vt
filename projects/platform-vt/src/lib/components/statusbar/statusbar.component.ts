import { Component, inject, input, effect, ElementRef } from '@angular/core';
import { RenderService } from '../../services/render.service';
import { TerminalService } from '../../services/terminal.service';

/**
 * A bottom status bar with left/center/right segments.
 *
 * Pins itself to the bottom of the terminal (absolute positioning) and shows
 * up to three text segments: `left`, `center` and `right`. Typically used
 * with `provideTerminalErrorHandler`-style global state or key hints.
 *
 * @example
 * ```html
 * <vt-statusbar left="ⓘ v1.0.0" center="-- INSERT --" right="Ctrl+P: palette"></vt-statusbar>
 * ```
 */
@Component({
  selector: 'vt-statusbar',
  template: '',
})
export class StatusBarComponent {
  private readonly elementRef = inject(ElementRef);
  private readonly renderService = inject(RenderService);
  private readonly terminal = inject(TerminalService);

  readonly left = input<string>('');
  readonly center = input<string>('');
  readonly right = input<string>('');
  readonly backgroundColor = input<string>('gray');
  readonly color = input<string>('bright-white');

  constructor() {
    effect(() => {
      const el = this.elementRef.nativeElement as HTMLElement;
      const left = this.left();
      const center = this.center();
      const right = this.right();
      const bg = this.backgroundColor();
      const fg = this.color();
      const columns = this.terminal.columns();

      el.setAttribute('display', 'flex');
      el.setAttribute('flex-direction', 'row');
      el.setAttribute('flex-shrink', '0');
      el.setAttribute('position', 'absolute');
      el.setAttribute('left', '0');
      el.setAttribute('top', String(Math.max(0, this.terminal.rows() - 1)));
      el.setAttribute('width', String(columns));
      el.setAttribute('background-color', bg);
      el.setAttribute('color', fg);

      const pad = Math.max(0, columns - left.length - right.length);
      const centerText = center.length > 0 ? ` ${center} ` : '';
      const text = left + ' '.repeat(pad) + centerText + right;
      const trimmed = text.substring(0, columns);
      el.setAttribute('content', trimmed);
      el.textContent = trimmed;
      this.renderService.scheduleRender();
    });
  }
}