import { Component, input, inject, effect, ElementRef, DestroyRef } from '@angular/core';
import { RenderService } from '../../services/render.service';
import { parseAnsi } from '../../output/ansi-parse';

/**
 * Renders text that already contains ANSI color/style codes with its colors
 * preserved.
 *
 * The input is parsed into styled segments ({@link parseAnsi}) and each
 * segment becomes a span in the DOM with the matching color/weight/decoration
 * attributes, so the regular flex layout and output pipeline paint them.
 * Useful for showing tool/CLI output (logs, diff output) captured from
 * another process.
 *
 * @example
 * ```html
 * <vt-ansi-text [content]="toolOutput()" [wrap]="true"></vt-ansi-text>
 * ```
 */
@Component({
  selector: 'vt-ansi-text',
  template: '',
})
export class AnsiTextComponent {
  private readonly elementRef = inject(ElementRef);
  private readonly renderService = inject(RenderService);
  private readonly destroyRef = inject(DestroyRef);

  /** Text possibly containing `\x1b[...m` SGR sequences. */
  readonly content = input.required<string>();

  /** Whether long segments should wrap at word boundaries. */
  readonly wrap = input<boolean>(false);

  constructor() {
    effect(() => {
      const el = this.elementRef.nativeElement as HTMLElement;
      const segments = parseAnsi(this.content());
      el.setAttribute('display', 'flex');
      el.setAttribute('flex-direction', 'row');
      el.setAttribute('flex-wrap', this.wrap() ? 'wrap' : 'nowrap');

      // Keep the number of spans in sync with the parsed segments.
      while (el.children.length > segments.length) {
        el.lastElementChild?.remove();
      }
      while (el.children.length < segments.length) {
        const span = document.createElement('vt-ansi-segment');
        span.setAttribute('display', 'block');
        span.setAttribute('flex-shrink', '0');
        el.appendChild(span);
      }

      for (let i = 0; i < segments.length; i++) {
        const segment = segments[i]!;
        const span = el.children[i] as HTMLElement;
        span.textContent = segment.text;
        span.setAttribute('content', segment.text);
        if (segment.color) span.setAttribute('color', segment.color);
        else span.removeAttribute('color');
        if (segment.backgroundColor) span.setAttribute('background-color', segment.backgroundColor);
        else span.removeAttribute('background-color');
        if (segment.bold) span.setAttribute('font-weight', 'bold');
        else span.removeAttribute('font-weight');
        if (segment.dim) span.setAttribute('opacity', 'dim');
        else span.removeAttribute('opacity');
        if (segment.italic) span.setAttribute('font-style', 'italic');
        else span.removeAttribute('font-style');
        if (segment.underline) span.setAttribute('text-decoration', 'underline');
        else span.removeAttribute('text-decoration');
        if (segment.strikethrough) span.setAttribute('text-decoration', 'strikethrough');
      }

      this.renderService.scheduleRender();
    });

    this.destroyRef.onDestroy(() => {
      const el = this.elementRef.nativeElement as HTMLElement;
      el.replaceChildren();
    });
  }
}