import { Component, input, inject, effect, ElementRef } from '@angular/core';
import { RenderService } from '../../services/render.service';
import { VtLayoutDirective } from '../../directives/flex-layout.directive';
import { VtSizingDirective } from '../../directives/sizing.directive';
import { VtSpacingDirective } from '../../directives/spacing.directive';
import { VtAppearanceDirective } from '../../directives/appearance.directive';
import { VtTypographyDirective } from '../../directives/typography.directive';

/**
 * An OSC 8 hyperlink: the terminal renders the text as a clickable link
 * (usually Ctrl/Cmd+click to open). The renderer wraps the painted line in
 * `\x1b]8;;<url>\x1b\\ ... \x1b]8;;\x1b\\`, so the link stays intact across
 * the full text node.
 *
 * @example
 * ```html
 * <vt-link href="https://angular.dev" content="Angular"></vt-link>
 * ```
 */
@Component({
  selector: 'vt-link',
  template: '',
  hostDirectives: [
    {
      directive: VtLayoutDirective,
      inputs: ['flexDirection', 'justifyContent', 'alignItems', 'flexGrow', 'flexShrink'],
    },
    { directive: VtSizingDirective, inputs: ['width', 'height'] },
    { directive: VtSpacingDirective, inputs: ['padding', 'margin', 'gap'] },
    { directive: VtAppearanceDirective, inputs: ['color', 'backgroundColor', 'fontWeight', 'textAlign'] },
    { directive: VtTypographyDirective, inputs: ['fontStyle', 'textDecoration', 'opacity', 'wrap'] },
  ],
})
export class LinkComponent {
  private readonly elementRef = inject(ElementRef);
  private readonly renderService = inject(RenderService);

  /** The visible link text. */
  readonly content = input.required<string>();

  /** The target URL. */
  readonly href = input.required<string>();

  /** Optional link id (groups links; some terminals open them as one session). */
  readonly linkId = input<string>('');

  constructor() {
    effect(() => {
      const el = this.elementRef.nativeElement as HTMLElement;
      const c = this.content();
      const href = this.href();
      el.textContent = c;
      el.setAttribute('display', 'block');
      el.setAttribute('flex-shrink', '0');
      el.setAttribute('content', c);
      el.setAttribute('hyperlink', href);
      if (this.linkId().length > 0) {
        el.setAttribute('hyperlink-id', this.linkId());
      } else {
        el.removeAttribute('hyperlink-id');
      }
      this.renderService.scheduleRender();
    });
  }
}