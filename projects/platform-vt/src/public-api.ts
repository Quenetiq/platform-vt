// VTNode types (used internally, exported for type compatibility)
export { createVTNode, appendVTChild, insertVTBefore, removeVTChild, resetVTNodeId } from './lib/renderer/vt-node';
export type { VTNode, VTNodeType, LayoutRect } from './lib/renderer/vt-node';

// Layout
export { DEFAULT_FLEX_STYLES } from './lib/layout/layout-node';
export type { LayoutNode, FlexStyles, Spacing } from './lib/layout/layout-node';
export { FlexLayout } from './lib/layout/flex-layout';
export { resolveFlexStyles, isFlexContainer } from './lib/layout/resolve-styles';

// Output
export { TerminalOutput } from './lib/output/terminal-output';
export { cursor, erase, fg, bg, txt, reset, ESC } from './lib/output/ansi';
export { resolveColor, wrapColor } from './lib/output/color-map';

// Services
export { TerminalService } from './lib/services/terminal.service';
export { RenderService, provideRenderService } from './lib/services/render.service';
export { InputService } from './lib/services/input.service';
export type { VTKeyEvent } from './lib/services/input.service';
export { FocusService } from './lib/services/focus.service';
export type { FocusableElement } from './lib/services/focus.service';
export { MouseService } from './lib/services/mouse.service';
export { ClickService, provideClickService, hitTestClickable } from './lib/services/click.service';
export type { ClickableElement } from './lib/services/click.service';
export { parseSgrMouse, extractSgrSequences, trackClick } from './lib/services/sgr-mouse';
export type {
  VTMouseButton,
  VTMouseEventType,
  VTMouseEvent,
  VTClickEvent,
} from './lib/services/sgr-mouse';

// Bootstrap
export { bootstrapTerminal } from './lib/bootstrap';
export type { TerminalBootstrapOptions } from './lib/bootstrap';

// Styles / theming
export { parseStylesheet } from './lib/styles/parse-stylesheet';
export { StyleRegistry, STYLE_READER, mergeTheme } from './lib/styles/style-registry';
export type { VTStyleReader } from './lib/styles/style-registry';
export { provideStyles } from './lib/styles/provide-styles';
export { PROPERTY_MAP } from './lib/styles/stylesheet';
export type { VTStyleSheet, VTStyleRule, VTStyleValue } from './lib/styles/stylesheet';

// Style host directives
export { applyHostStyles } from './lib/directives/apply-host-styles';
export type { HostStyleInput } from './lib/directives/apply-host-styles';
export { VtLayoutDirective } from './lib/directives/flex-layout.directive';
export { VtSizingDirective } from './lib/directives/sizing.directive';
export { VtSpacingDirective } from './lib/directives/spacing.directive';
export { VtBorderDirective } from './lib/directives/border.directive';
export { VtAppearanceDirective } from './lib/directives/appearance.directive';
export { VtTypographyDirective } from './lib/directives/typography.directive';

// Components
export { BoxComponent } from './lib/components/box/box.component';
export { TextComponent } from './lib/components/text/text.component';
export { NewlineComponent } from './lib/components/newline/newline.component';
export { SpacerComponent } from './lib/components/spacer/spacer.component';
export { SeparatorComponent } from './lib/components/separator/separator.component';
export { ClickableDirective } from './lib/components/clickable/clickable.directive';
export { InputComponent } from './lib/components/input/input.component';
export { ButtonComponent } from './lib/components/button/button.component';
export { SelectComponent } from './lib/components/select/select.component';
export { CheckboxComponent } from './lib/components/checkbox/checkbox.component';
export { SpinnerComponent } from './lib/components/spinner/spinner.component';
export { CaretComponent } from './lib/components/caret/caret.component';
export { ProgressComponent } from './lib/components/progress/progress.component';
export { ListComponent } from './lib/components/list/list.component';
export { TableComponent } from './lib/components/table/table.component';
export { ScrollViewComponent } from './lib/components/scroll/scroll.component';
