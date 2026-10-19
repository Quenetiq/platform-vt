/** The kind of change a diff line represents. */
export type DiffLineType = 'add' | 'del' | 'same';

/** A single line of a computed diff. */
export interface DiffLine {
  type: DiffLineType;
  /** The line text (without the `+`/`-`/` ` prefix). */
  text: string;
}

/**
 * Compute a line-based diff of two texts (LCS algorithm).
 *
 * Returns the merged view: unchanged lines with `type: 'same'`, inserted
 * lines with `'add'` and removed lines with `'del'`.
 *
 * @param oldText - The original text.
 * @param newText - The changed text.
 * @returns The diff lines in order.
 */
export function diffLines(oldText: string, newText: string): DiffLine[] {
  // An empty text has no lines (''.split('\n') would yield [''], a phantom
  // "same" line).
  const oldLines = oldText.length === 0 ? [] : oldText.split('\n');
  const newLines = newText.length === 0 ? [] : newText.split('\n');
  const n = oldLines.length;
  const m = newLines.length;

  // LCS table: lcs[i][j] = length of LCS of oldLines[i:] and newLines[j:].
  const lcs: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      lcs[i]![j] =
        oldLines[i] === newLines[j]
          ? lcs[i + 1]![j + 1]! + 1
          : Math.max(lcs[i + 1]![j]!, lcs[i]![j + 1]!);
    }
  }

  const result: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (oldLines[i] === newLines[j]) {
      result.push({ type: 'same', text: oldLines[i]! });
      i++;
      j++;
    } else if (lcs[i + 1]![j]! >= lcs[i]![j + 1]!) {
      result.push({ type: 'del', text: oldLines[i]! });
      i++;
    } else {
      result.push({ type: 'add', text: newLines[j]! });
      j++;
    }
  }
  while (i < n) {
    result.push({ type: 'del', text: oldLines[i]! });
    i++;
  }
  while (j < m) {
    result.push({ type: 'add', text: newLines[j]! });
    j++;
  }

  return result;
}
