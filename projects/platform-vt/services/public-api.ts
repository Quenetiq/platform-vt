// Services subpath entry point.
//
// `import { InputService } from '@quenetiq/platform-vt/services';`
// Re-exports the services from the primary entry point, so instances stay
// shared (no duplicated service classes).

export { TerminalService } from '@quenetiq/platform-vt';
export { detectCapabilities } from '@quenetiq/platform-vt';
export type { TerminalCapabilities } from '@quenetiq/platform-vt';
export {
  ThemeService,
  provideTheme,
  parseOscColor,
  detectColorScheme,
  colorSchemeForBackground,
  DARK_THEME,
  LIGHT_THEME,
} from '@quenetiq/platform-vt';
export type { ColorScheme, ThemeColors, ThemeQueryResult } from '@quenetiq/platform-vt';
export {
  BreakpointService,
  provideBreakpoints,
  BREAKPOINT_CONFIG,
  DEFAULT_BREAKPOINTS,
} from '@quenetiq/platform-vt';
export type { Breakpoint, BreakpointConfig } from '@quenetiq/platform-vt';
export { RenderService, provideRenderService } from '@quenetiq/platform-vt';
export { InputService } from '@quenetiq/platform-vt';
export type { VTKeyEvent } from '@quenetiq/platform-vt';
export { FocusService } from '@quenetiq/platform-vt';
export type { FocusableElement } from '@quenetiq/platform-vt';
export { MouseService } from '@quenetiq/platform-vt';
export { ClickService, provideClickService, hitTestClickable } from '@quenetiq/platform-vt';
export type { ClickableElement } from '@quenetiq/platform-vt';
export { WheelService, provideWheelService } from '@quenetiq/platform-vt';
export type { WheelableElement } from '@quenetiq/platform-vt';
export { HoverService, provideHoverService } from '@quenetiq/platform-vt';
export type { HoverableElement } from '@quenetiq/platform-vt';
export { SelectionService, provideSelectionService, normalizeRegion } from '@quenetiq/platform-vt';
export { DragService, provideDragService } from '@quenetiq/platform-vt';
export type { DraggableElement, DropZoneElement, DragEndEvent } from '@quenetiq/platform-vt';
export { SessionRecorder, provideSessionRecorder } from '@quenetiq/platform-vt';
export { PersistenceService, providePersistence } from '@quenetiq/platform-vt';
export { TerminalErrorHandler, provideTerminalErrorHandler } from '@quenetiq/platform-vt';
export { CommandPaletteService, provideCommandPalette } from '@quenetiq/platform-vt';
export { KeymapService, provideKeymapService, keyFromEvent } from '@quenetiq/platform-vt';
export type { KeyHandler } from '@quenetiq/platform-vt';
export { ClipboardService, provideClipboardService } from '@quenetiq/platform-vt';
export { ToastService, provideToasts } from '@quenetiq/platform-vt';
export type { Toast, ToastOptions, ToastVariant } from '@quenetiq/platform-vt';
export { DialogService, DialogRef } from '@quenetiq/platform-vt';
export type { DialogOptions } from '@quenetiq/platform-vt';
export { OverlayContainer } from '@quenetiq/platform-vt';
export { OverlayService, provideOverlay } from '@quenetiq/platform-vt';
export { OverlayRef } from '@quenetiq/platform-vt';
export type { OverlayOptions } from '@quenetiq/platform-vt';
export { DevtoolsService, provideDevtools } from '@quenetiq/platform-vt';
export { MenuService } from '@quenetiq/platform-vt';
export type { MenuItem } from '@quenetiq/platform-vt';
