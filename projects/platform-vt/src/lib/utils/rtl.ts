/**
 * Minimal right-to-left text support.
 *
 * Terminals store and render text in logical order; most of them do not run
 * the Unicode Bidirectional Algorithm, so Hebrew/Arabic strings mixed with
 * Latin text render with reversed word order. These helpers detect RTL text
 * and reorder the RTL runs for correct visual display in a TUI.
 */

/** Hebrew, Arabic, Syriac, Thaana, N'Ko, Samaritan, Mandaic and their presentations forms. */
const RTL_RE = /[\u0590-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFF]/;
const RTL_CHAR_RE = /[\u0590-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFF]/;
const DIGIT_RE = /[0-9]/;
const LTR_RE = /[A-Za-z]/;

/** Whether the text contains any right-to-left characters. */
export function hasRtl(text: string): boolean {
  return RTL_RE.test(text);
}

/**
 * Reorder RTL runs in a mixed line for visual display.
 *
 * Each maximal run of RTL characters (plus adjacent spaces/punctuation) is
 * reversed character-by-character, while sequences of digits are kept in
 * place (they are weak-LTR and must not be reversed). Latin runs and
 * whitespace between RTL and Latin text are left untouched.
 *
 * @example
 * ```typescript
 * flipRtlRuns('שלום world'); // 'םולש world'
 * flipRtlRuns('مرحبا 123');  // 'ابحرم 123'
 * ```
 */
export function flipRtlRuns(text: string): string {
  const result: string[] = [];
  let i = 0;
  const length = text.length;

  while (i < length) {
    if (!RTL_CHAR_RE.test(text[i]!)) {
      // Copy LTR/neutral characters verbatim.
      result.push(text[i]!);
      i++;
      continue;
    }

    // Collect the RTL run: RTL chars plus adjacent neutrals. Trailing
    // spaces are the gap before the next LTR text and stay in place;
    // punctuation binds to the run and is reversed with it.
    let end = i;
    while (end < length && (RTL_CHAR_RE.test(text[end]!) || isNeutral(text[end]!))) {
      end++;
    }
    let runEnd = end - 1;
    while (runEnd >= i && (text[runEnd] === ' ' || text[runEnd] === '\t')) {
      runEnd--;
    }
    runEnd++;
    const tail = text.substring(runEnd, end);

    // Tokenize the run into atoms; digit sequences stay in order.
    const atoms: string[] = [];
    let j = i;
    while (j < runEnd) {
      if (DIGIT_RE.test(text[j]!)) {
        let k = j;
        while (k < runEnd && DIGIT_RE.test(text[k]!)) k++;
        atoms.push(text.substring(j, k));
        j = k;
      } else {
        atoms.push(text[j]!);
        j++;
      }
    }
    result.push(atoms.reverse().join('') + tail);
    i = end;
  }

  return result.join('');
}

/** Space and common punctuation that visually joins adjacent RTL text. */
function isNeutral(char: string): boolean {
  return char === ' ' || (!LTR_RE.test(char) && !DIGIT_RE.test(char));
}
