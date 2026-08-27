/**
 * Fuzzy matching for the command palette: subsequence match with scoring.
 *
 * `fuzzyMatch(query, text)` returns a score (higher = better) or `null` when
 * the query characters do not appear in order. Consecutive runs and matches
 * at word starts score higher, so `'del'` beats `'d..e..l'` for `'Delete'`.
 */

/** Score a fuzzy match; returns null when the query is not a subsequence. */
export function fuzzyMatch(query: string, text: string): number | null {
  if (query.length === 0) return 0;
  const q = query.toLowerCase();
  const t = text.toLowerCase();
  if (q.length > t.length) return null;

  let score = 0;
  let qi = 0;
  let consecutive = 0;
  let prevMatched = -2;

  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) {
      score += 1;
      if (ti === prevMatched + 1) {
        consecutive += 1;
        score += consecutive * 2;
      } else {
        consecutive = 0;
        // Bonus for a match at a word boundary.
        if (ti === 0 || /[\s\-_./]/.test(t[ti - 1] ?? '')) {
          score += 3;
        }
      }
      prevMatched = ti;
      qi++;
    }
  }
  return qi === q.length ? score : null;
}

/**
 * Sort candidate texts by fuzzy relevance (best first).
 * Only texts matching `query` are returned.
 */
export function fuzzyRank(query: string, texts: string[], limit = 10): string[] {
  const scored: { text: string; score: number }[] = [];
  for (const text of texts) {
    const score = fuzzyMatch(query, text);
    if (score !== null) scored.push({ text, score });
  }
  scored.sort((a, b) => b.score - a.score || a.text.localeCompare(b.text));
  return scored.slice(0, limit).map((entry) => entry.text);
}