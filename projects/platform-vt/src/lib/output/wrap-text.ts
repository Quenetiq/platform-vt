/**
 * Wrap text into lines that fit the given width using word-boundary wrapping.
 *
 * Single words longer than the width are kept whole on their own line (the
 * renderer truncates them later), so the returned line count always matches
 * the number of rows the text will actually occupy.
 *
 * @param text - The text to wrap.
 * @param width - Maximum line width in columns.
 * @returns The wrapped lines.
 */
export function wrapText(text: string, width: number): string[] {
  if (width <= 0) return [];
  const words = text.split(/(\s+)/);
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine.length === 0 ? word : currentLine + word;
    if (testLine.length > width && currentLine.length > 0) {
      lines.push(currentLine);
      currentLine = word.trim() === '' ? '' : word;
    } else {
      currentLine = testLine;
    }
  }

  if (currentLine.length > 0 || lines.length === 0) {
    lines.push(currentLine);
  }

  return lines;
}
