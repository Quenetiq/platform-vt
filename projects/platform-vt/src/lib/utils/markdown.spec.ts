import { describe, it, expect } from 'vitest';
import { parseMarkdown, markdownCodeLanguage } from './markdown';
import { highlightCode } from './highlight';

describe('parseMarkdown', () => {
  it('parses headings with their level', () => {
    const lines = parseMarkdown('# Title\n\n### Sub\nplain');
    expect(lines[0]!.heading).toBe(1);
    expect(lines[1]!.heading).toBeUndefined();
    expect(lines[2]!.heading).toBe(3);
  });

  it('parses inline bold, italic and code', () => {
    const [line] = parseMarkdown('a **bold** b *it* c `code` d');
    expect(
      line!.segments.map((s) => ({ text: s.text, bold: s.bold, italic: s.italic, dim: s.dim })),
    ).toEqual([
      { text: 'a ', bold: undefined, italic: undefined, dim: undefined },
      { text: 'bold', bold: true, italic: undefined, dim: undefined },
      { text: ' b ', bold: undefined, italic: undefined, dim: undefined },
      { text: 'it', bold: undefined, italic: true, dim: undefined },
      { text: ' c ', bold: undefined, italic: undefined, dim: undefined },
      { text: 'code', bold: undefined, italic: undefined, dim: true },
      { text: ' d', bold: undefined, italic: undefined, dim: undefined },
    ]);
  });

  it('detects blockquotes and horizontal rules', () => {
    const lines = parseMarkdown('> quoted\n---');
    expect(lines[0]!.quote).toBe(true);
    expect(lines[1]!.rule).toBe(true);
  });

  it('extracts fenced code blocks and their language', () => {
    const lines = parseMarkdown('```ts\nconst x: number = 1;\n```\nafter');
    expect(lines[0]!.code).toBe(true);
    expect(lines[0]!.codeLanguage).toBe('ts');
    expect(lines[1]!.segments[0]!.text).toBe('after');
    expect(lines[1]!.code).toBeUndefined();
    expect(markdownCodeLanguage(lines)).toBe('ts');
  });

  it('treats list lines as plain text', () => {
    const lines = parseMarkdown('- item\n1. two');
    expect(lines[0]!.segments[0]!.text).toBe('- item');
    expect(lines[1]!.segments[0]!.text).toBe('1. two');
  });
});

describe('highlightCode', () => {
  it('highlights keywords, strings, numbers and comments', () => {
    const tokens = highlightCode('const x = "hi" + 42; // note', 'ts');
    const texts = tokens.map((t) => t.text);
    expect(texts.join('')).toBe('const x = "hi" + 42; // note');
    const keyword = tokens.find((t) => t.text === 'const');
    expect(keyword?.color).toBe('magenta');
    const str = tokens.find((t) => t.text === '"hi"');
    expect(str?.color).toBe('green');
    const num = tokens.find((t) => t.text === '42');
    expect(num?.color).toBe('cyan');
    const comment = tokens.find((t) => t.text.includes('note'));
    expect(comment?.color).toBe('gray');
    expect(comment?.italic).toBe(true);
  });

  it('recognizes Python-style comments', () => {
    const tokens = highlightCode('def f(): pass  # comment', 'py');
    expect(tokens.find((t) => t.text.includes('comment'))?.color).toBe('gray');
    expect(tokens.find((t) => t.text === 'def')?.color).toBe('magenta');
  });

  it('colors identifiers differently from call names', () => {
    const tokens = highlightCode('foo(bar)', 'ts');
    expect(tokens.find((t) => t.text === 'foo')?.color).toBe('yellow');
    expect(tokens.find((t) => t.text.includes('bar'))?.color).toBe('white');
  });

  it('handles an empty line', () => {
    expect(highlightCode('', 'ts')).toEqual([]);
  });
});
