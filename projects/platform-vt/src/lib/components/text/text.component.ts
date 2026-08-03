import { Component, input, inject, effect, ElementRef } from '@angular/core';
import { RenderService } from '../../services/render.service';
import { VtLayoutDirective } from '../../directives/flex-layout.directive';
import { VtSizingDirective } from '../../directives/sizing.directive';
import { VtSpacingDirective } from '../../directives/spacing.directive';
import { VtAppearanceDirective } from '../../directives/appearance.directive';
import { VtTypographyDirective } from '../../directives/typography.directive';

/**
 * A single line (or wrapped block) of terminal text.
 *
 * Styling comes from host directives; the component only owns the `content`
 * input and keeps the host wired up as a block-level, non-shrinking text node
 * for the layout engine.
 *
 * @example
 * ```html
 * <vt-text content="Hello" [color]="'#58a6ff'" [wrap]="'wrap'"></vt-text>
 * ```
 */
@Component({
  selector: 'vt-text',
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
export class TextComponent {
  private readonly elementRef = inject(ElementRef);
  private readonly renderService = inject(RenderService);

  /** The text content to display. */
  readonly content = input<string>('');

  constructor() {
    effect(() => {
      const el = this.elementRef.nativeElement as HTMLElement;
      const c = this.content();
      el.textContent = c;
      el.setAttribute('display', 'block');
      el.setAttribute('flex-shrink', '0');
      el.setAttribute('content', c);
      this.renderService.scheduleRender();
    });
  }
}
