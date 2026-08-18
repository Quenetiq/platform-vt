import { Component, input } from '@angular/core';
import { BoxComponent } from '../box/box.component';
import { TextComponent } from '../text/text.component';

/**
 * The content rendered inside a tooltip overlay.
 *
 * Rendered automatically by {@link TooltipDirective}; not meant to be used
 * directly. A bordered box with the tooltip text on a contrasting background.
 */
@Component({
  selector: 'vt-tooltip',
  imports: [BoxComponent, TextComponent],
  template: `
    <vt-box padding="0 1" border="single" backgroundColor="black" color="white">
      <vt-text [content]="text()"></vt-text>
    </vt-box>
  `,
})
export class TooltipComponent {
  /** The tooltip text. */
  readonly text = input.required<string>();
}