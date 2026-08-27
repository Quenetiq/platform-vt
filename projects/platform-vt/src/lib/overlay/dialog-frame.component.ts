import { Component, input, type TemplateRef } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { BoxComponent } from '../components/box/box.component';
import { TextComponent } from '../components/text/text.component';

/**
 * A generic dialog frame that hosts arbitrary projected template content.
 *
 * Used by {@link import('./dialog.service').DialogService.openTemplate}:
 * pass a `TemplateRef` (typically a `<ng-template>` with your own layout —
 * boxes, inputs, buttons — which renders through the terminal renderer
 * inside the framed window).
 *
 * @example
 * ```html
 * <ng-template #settings let-close="close">
 *   <vt-box flexDirection="column" [gap]="1">
 *     <vt-text content="Volume"></vt-text>
 *     <vt-slider [value]="volume()" (valueChange)="volume.set($event)"></vt-slider>
 *     <vt-button label="Done" (clicked)="close()"></vt-button>
 *   </vt-box>
 * </ng-template>
 * ```
 */
@Component({
  selector: 'vt-dialog-frame',
  imports: [NgTemplateOutlet, BoxComponent, TextComponent],
  template: `
    <vt-box flexDirection="column" [gap]="1" [padding]="1" border="double" [width]="width()" [height]="height()">
      @if (title()) {
        <vt-text [content]="title()" fontWeight="bold" color="cyan" textAlign="center"></vt-text>
      }
      <ng-container *ngTemplateOutlet="template(); context: context()"></ng-container>
    </vt-box>
  `,
})
export class TemplateDialogComponent {
  /** The template to render inside the frame. */
  readonly template = input.required<TemplateRef<unknown>>();

  /** Context for the template (exposed as local variables). */
  readonly context = input<Record<string, unknown>>({});

  /** Optional title line at the top of the frame. */
  readonly title = input<string>('');

  /** Frame width in columns (or 'auto'). */
  readonly width = input<number | 'auto'>('auto');

  /** Frame height in rows (or 'auto'). */
  readonly height = input<number | 'auto'>('auto');
}