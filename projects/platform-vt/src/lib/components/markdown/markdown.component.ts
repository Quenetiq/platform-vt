import { Component, effect, ElementRef, inject, input } from '@angular/core';
import { RenderService } from '../../services/render.service';
import { parseMarkdown, type MarkdownLine, type MarkdownSegment } from '../../utils/markdown';
import { highlightCode } from '../../utils/highlight';
import { LINE_ATTRS, setCellText, syncChildren } from '../../cdk/dom';

/**
 * Renders markdown text as styled terminal lines.
 *
 * Supports headings (`#`..`######`), bold/italic and inline code, blockquotes,
 * horizontal rules, lists (plain text) and fenced code blocks. Code blocks are
 * syntax-highlighted (see {@link highlightCode}) unless `[highlight]="false"`.
 *
 * @example
 * ```html
 * <vt-markdown [content]="readme()"></vt-markdown>
 * ```
 */
@Component({
  selector: 'vt-markdown',
  template: '',
})
export class MarkdownComponent {
  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly renderService = inject(RenderService);

  /** Markdown source to render. */
  readonly content = input.required<string>();
  /** Syntax-highlight fenced code blocks. */
  readonly highlight = input<boolean>(true);
  /** Color for headings. */
  readonly headingColor = input<string>('bright-white');
  /** Color for blockquote text. */
  readonly quoteColor = input<string>('yellow');
  /** Color for inline code. */
  readonly codeColor = input<string>('cyan');

  constructor() {
    effect(() => {
      const el = this.elementRef.nativeElement as HTMLElement;
      const lines = parseMarkdown(this.content());
      const highlight = this.highlight();
      const headingColor = this.headingColor();
      const quoteColor = this.quoteColor();
      const codeColor = this.codeColor();

      el.setAttribute('display', 'flex');
      el.setAttribute('flex-direction', 'column');
      el.setAttribute('flex-shrink', '0');

      const rows = syncChildren(el, lines.length, 'vt-markdown-line', LINE_ATTRS);

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]!;
        const row = rows[i]!;
        const segments = this.segmentsFor(line, {
          highlight,
          headingColor,
          quoteColor,
          codeColor,
        });

        const spans = syncChildren(row, segments.length, 'vt-markdown-seg', {
          display: 'block',
          'flex-shrink': '0',
        });

        for (let s = 0; s < segments.length; s++) {
          const seg = segments[s]!;
          const span = spans[s]!;
          setCellText(span, seg.text);
          span.setAttribute('color', seg.color ?? '');
          if (seg.bold) span.setAttribute('font-weight', 'bold');
          else span.removeAttribute('font-weight');
          if (seg.italic) span.setAttribute('font-style', 'italic');
          else span.removeAttribute('font-style');
          if (seg.underline) span.setAttribute('text-decoration', 'underline');
          else span.removeAttribute('text-decoration');
          if (seg.dim) span.setAttribute('opacity', 'dim');
          else span.removeAttribute('opacity');
        }
      }
      this.renderService.scheduleRender();
    });
  }

  private segmentsFor(
    line: MarkdownLine,
    opts: { highlight: boolean; headingColor: string; quoteColor: string; codeColor: string },
  ): MarkdownSegment[] {
    if (line.code) {
      if (!opts.highlight) {
        return [{ text: line.segments[0]?.text ?? '', color: opts.codeColor }];
      }
      return highlightCode(line.segments[0]?.text ?? '', line.codeLanguage).map((token) => ({
        text: token.text,
        color: token.color,
        italic: token.italic,
      }));
    }

    const segments = line.segments.map((segment) => ({ ...segment }));
    if (line.heading) {
      segments.forEach((segment) => {
        segment.bold = true;
        segment.color = opts.headingColor;
      });
    }
    if (line.quote) {
      segments.forEach((segment) => {
        segment.color = opts.quoteColor;
      });
    }
    if (line.rule) {
      segments.forEach((segment) => {
        segment.dim = true;
      });
    }
    return segments;
  }
}
