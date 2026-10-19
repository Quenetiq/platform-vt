/** A styled fragment of a markdown line. */
export interface MarkdownSegment {
  /** The plain text of the fragment. */
  text: string;
  /** Bold (`**x**`). */
  bold?: boolean;
  /** Italic (`*x*`). */
  italic?: boolean;
  /** Underline (`<u>x</u>` is not supported; reserved). */
  underline?: boolean;
  /** Dimmed (inline code `` `x` ``). */
  dim?: boolean;
  /** Explicit color (set by block-level rules). */
  color?: string;
}

/** A single rendered line of markdown. */
export interface MarkdownLine {
  /** Inline segments; typically one per styled fragment. */
  segments: MarkdownSegment[];
  /** Heading level 1-6 for `#`..`######` lines. */
  heading?: number;
  /** Whether the line is a blockquote (`>` prefix). */
  quote?: boolean;
  /** Whether the line belongs to a fenced code block. */
  code?: boolean;
  /** Language tag of the fenced block (set on the first code line). */
  codeLanguage?: string;
  /** Whether the line is a horizontal rule (`---`). */
  rule?: boolean;
}

/** Matches inline markup: bold, italic, bold+italic, inline code. */
const INLINE_RE =
  /(\*\*\*[^*\n]+\*\*\*|\*\*[^*\n]+\*\*|__[^_\n]+__|\*[^*\n]+\*|_[^_\n]+_|`[^`\n]+`)/g;

const HEADING_RE = /^(#{1,6})\s+(.*)$/;
const QUOTE_RE = /^>\s?(.*)$/;
const RULE_RE = /^\s*(---|\*\*\*|___)\s*$/;
const FENCE_RE = /^```(\w*)\s*$/;

/**
 * Parse markdown into styled lines.
 *
 * Supports ATX headings, blockquotes, horizontal rules, fenced code blocks
 * (content is returned as raw `code` lines), unordered/ordered lists (kept
 * as plain text), and inline `**bold**`, `*italic*` and `` `code` ``.
 *
 * @param source - Markdown source text.
 * @returns The parsed lines, in order.
 */
export function parseMarkdown(source: string): MarkdownLine[] {
  const rawLines = source.split('\n');
  const lines: MarkdownLine[] = [];
  let inCode = false;
  let codeLang = '';
  let firstCodeLine = true;

  for (const raw of rawLines) {
    const fence = FENCE_RE.exec(raw);
    if (fence) {
      if (!inCode) {
        inCode = true;
        codeLang = fence[1] ?? '';
        firstCodeLine = true;
      } else {
        inCode = false;
        codeLang = '';
      }
      continue;
    }

    if (inCode) {
      lines.push({
        segments: [{ text: raw }],
        code: true,
        codeLanguage: firstCodeLine ? codeLang || undefined : undefined,
      });
      firstCodeLine = false;
      continue;
    }

    const heading = HEADING_RE.exec(raw);
    if (heading) {
      lines.push({
        segments: parseInline(heading[2] ?? ''),
        heading: heading[1]!.length,
      });
      continue;
    }

    const quote = QUOTE_RE.exec(raw);
    if (quote) {
      lines.push({ segments: parseInline(quote[1] ?? ''), quote: true });
      continue;
    }

    if (RULE_RE.test(raw)) {
      lines.push({ segments: [{ text: raw }], rule: true });
      continue;
    }

    lines.push({ segments: parseInline(raw) });
  }

  return lines;
}

/** Language of the first fenced block, if any (for syntax highlighting). */
export function markdownCodeLanguage(lines: MarkdownLine[]): string {
  return lines.find((l) => l.codeLanguage)?.codeLanguage ?? '';
}

function parseInline(text: string): MarkdownSegment[] {
  const segments: MarkdownSegment[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(INLINE_RE)) {
    const index = match.index ?? 0;
    if (index > lastIndex) {
      segments.push({ text: text.substring(lastIndex, index) });
    }
    segments.push(segmentFor(match[1]!));
    lastIndex = index + match[1]!.length;
  }
  if (lastIndex < text.length) {
    segments.push({ text: text.substring(lastIndex) });
  }
  if (segments.length === 0) segments.push({ text });

  return segments;
}

function segmentFor(token: string): MarkdownSegment {
  if (token.startsWith('`')) {
    return { text: token.slice(1, -1), dim: true };
  }
  if (token.startsWith('***')) {
    return { text: token.slice(3, -3), bold: true, italic: true };
  }
  if (token.startsWith('**')) {
    return { text: token.slice(2, -2), bold: true };
  }
  if (token.startsWith('__')) {
    return { text: token.slice(2, -2), bold: true };
  }
  if (token.startsWith('*')) {
    return { text: token.slice(1, -1), italic: true };
  }
  return { text: token.slice(1, -1), italic: true };
}
