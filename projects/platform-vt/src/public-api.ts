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
export { cursor, erase, fg, bg, txt, reset, ESC, mode, osc } from './lib/output/ansi';
export {
  resolveColor,
  wrapColor,
  resolveColorRgb,
  wrapColorRgb,
  resolveColorAdaptive,
  wrapColorAdaptive,
  rgbTo256,
  rgbToNearest16,
} from './lib/output/color-map';
export type { ColorMode } from './lib/output/color-map';
export { parseAnsi } from './lib/output/ansi-parse';
export type { AnsiSegment } from './lib/output/ansi-parse';
export {
  stringWidth,
  cellWidth,
  truncateToWidth,
  truncateFromStart,
  padToWidth,
  dropCellsFromStart,
  isWideChar,
  isZeroWidthChar,
} from './lib/output/unicode-width';
export { wrapText } from './lib/output/wrap-text';
export { sixelEncode, sixelWrite, parsePpmP6 } from './lib/output/sixel';

// Services
export { TerminalService } from './lib/services/terminal.service';
export { detectCapabilities } from './lib/services/terminal.service';
export type { TerminalCapabilities } from './lib/services/terminal.service';
export { RenderService, provideRenderService } from './lib/services/render.service';
export { InputService } from './lib/services/input.service';
export type { VTKeyEvent } from './lib/services/input.service';
export { FocusService } from './lib/services/focus.service';
export type { FocusableElement } from './lib/services/focus.service';
export { MouseService } from './lib/services/mouse.service';
export { ClickService, provideClickService, hitTestClickable } from './lib/services/click.service';
export type { ClickableElement } from './lib/services/click.service';
export { WheelService, provideWheelService } from './lib/services/wheel.service';
export type { WheelableElement } from './lib/services/wheel.service';
export { SelectionService, provideSelectionService, normalizeRegion } from './lib/services/selection.service';
export { DragService, provideDragService, DraggableDirective, DropZoneDirective } from './lib/services/drag.service';
export type { DraggableElement, DropZoneElement, DragEndEvent } from './lib/services/drag.service';
export { SessionRecorder, provideSessionRecorder } from './lib/services/session-recorder.service';
export { PersistenceService, providePersistence } from './lib/services/persistence.service';
export { ScreenBuffer, emptyCell, cellsEqual } from './lib/output/screen-buffer';
export type { Cell, CellRegion } from './lib/output/screen-buffer';
export { fuzzyMatch, fuzzyRank } from './lib/utils/fuzzy';
export { vimTranslate, VIM_NAVIGATION } from './lib/keymaps/vim.presets';
export { TerminalErrorHandler, provideTerminalErrorHandler } from './lib/services/terminal-error-handler';
export { CommandPaletteService, provideCommandPalette } from './lib/services/command-palette.service';
export { PaletteComponent } from './lib/components/palette/palette.component';
export type { PaletteCommand } from './lib/components/palette/palette.component';
export { SplitViewComponent } from './lib/components/split-view/split-view.component';
export { BadgeComponent } from './lib/components/badge/badge.component';
export type { BadgeVariant } from './lib/components/badge/badge.component';
export { StatusBarComponent } from './lib/components/statusbar/statusbar.component';
export { PaginatorComponent } from './lib/components/paginator/paginator.component';
export { ConfirmDialogComponent, PromptDialogComponent } from './lib/overlay/dialog-components';
export { KeymapService, provideKeymapService, keyFromEvent } from './lib/services/keymap.service';
export type { KeyHandler } from './lib/services/keymap.service';
export { ClipboardService, provideClipboardService } from './lib/services/clipboard.service';
export { ToastService, provideToasts } from './lib/services/toast.service';
export type { Toast, ToastOptions, ToastVariant } from './lib/services/toast.service';
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
export { ScrollViewComponent } from './lib/components/scroll/scroll.component';
export { TooltipComponent } from './lib/components/tooltip/tooltip.component';
export { TooltipDirective } from './lib/components/tooltip/tooltip.directive';
export type { TooltipPosition } from './lib/components/tooltip/tooltip.directive';
export { LinkComponent } from './lib/components/link/link.component';
export { AnsiTextComponent } from './lib/components/ansi-text/ansi-text.component';
export { TextAreaComponent } from './lib/components/textarea/textarea.component';
export { TabsComponent } from './lib/components/tabs/tabs.component';
export { RadioComponent, RadioGroupComponent } from './lib/components/radio/radio.component';
export { ToggleComponent } from './lib/components/toggle/toggle.component';
export { SliderComponent } from './lib/components/slider/slider.component';
export { SparklineComponent } from './lib/components/sparkline/sparkline.component';
export { TreeComponent } from './lib/components/tree/tree.component';
export type { TreeNode } from './lib/components/tree/tree.component';
export { AutocompleteComponent } from './lib/components/autocomplete/autocomplete.component';
export { ImageComponent } from './lib/components/image/image.component';
export { TableComponent } from './lib/components/table/table.component';
export type { TableSort, TableSortDirection } from './lib/components/table/table.component';
export { MenuComponent, MenuService } from './lib/components/menu/menu.component';
export type { MenuItem } from './lib/components/menu/menu.component';

// Forms
export { FormComponent, FormFieldComponent } from './lib/forms/form.component';
export type { FormControl } from './lib/forms/form.component';
export { compose, required, minLength, maxLength, pattern, email, min, max, equals } from './lib/forms/validators';
export type { ValidatorFn } from './lib/forms/validators';

// Overlay (CDK)
export { OverlayContainer } from './lib/overlay/overlay-container';
export { OverlayService, provideOverlay } from './lib/overlay/overlay.service';
export { OverlayRef } from './lib/overlay/overlay-ref';
export type { OverlayOptions } from './lib/overlay/overlay-ref';
export { DialogService, DialogRef } from './lib/overlay/dialog.service';
export type { DialogOptions } from './lib/overlay/dialog.service';
export {
  computeOverlayPosition,
  type OverlayAnchor,
  type OverlayPlacement,
  type OverlayViewport,
} from './lib/overlay/overlay-position';
export type { TerminalRenderOptions } from './lib/output/terminal-output';
