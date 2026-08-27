export { TerminalOutput, cursor, erase, fg, bg, txt, reset, ESC, mode, osc } from '@quenetiq/platform-vt';
export { resolveColor, wrapColor, resolveColorRgb, wrapColorRgb, resolveColorAdaptive, wrapColorAdaptive, rgbTo256, rgbToNearest16, ScreenBuffer, emptyCell, cellsEqual, parseAnsi, sixelEncode, sixelWrite, parsePpmP6, wrapText, stringWidth, cellWidth, truncateToWidth, truncateFromStart, padToWidth, dropCellsFromStart, isWideChar, isZeroWidthChar } from '@quenetiq/platform-vt';
export type { TerminalRenderOptions, ColorMode, Cell, CellRegion, AnsiSegment } from '@quenetiq/platform-vt';
