import { Component } from '@angular/core';
import { VtLayoutDirective } from '../../directives/flex-layout.directive';
import { VtSizingDirective } from '../../directives/sizing.directive';
import { VtSpacingDirective } from '../../directives/spacing.directive';
import { VtBorderDirective } from '../../directives/border.directive';
import { VtAppearanceDirective } from '../../directives/appearance.directive';

/**
 * A generic flexbox container.
 *
 * All styling is provided by host directives, so the component itself exposes
 * no inputs: `flexDirection`, `padding`, `border`, `color` and friends are
 * written to the host element by {@link VtLayoutDirective},
 * {@link VtSizingDirective}, {@link VtSpacingDirective},
 * {@link VtBorderDirective} and {@link VtAppearanceDirective}.
 *
 * @example
 * ```html
 * <vt-box flexDirection="column" [padding]="'1 2'" [gap]="1" class="block">
 *   <vt-text content="Hello"></vt-text>
 * </vt-box>
 * ```
 */
@Component({
  selector: 'vt-box',
  template: `<ng-content></ng-content>`,
  hostDirectives: [
    {
      directive: VtLayoutDirective,
      inputs: ['flexDirection', 'justifyContent', 'alignItems', 'flexGrow', 'flexShrink'],
    },
    { directive: VtSizingDirective, inputs: ['width', 'height'] },
    { directive: VtSpacingDirective, inputs: ['padding', 'margin', 'gap'] },
    {
      directive: VtBorderDirective,
      inputs: ['border', 'borderLeft', 'borderRadius'],
    },
    { directive: VtAppearanceDirective, inputs: ['color', 'backgroundColor', 'fontWeight', 'textAlign'] },
  ],
})
export class BoxComponent {}
