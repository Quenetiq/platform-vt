/** A syntax-highlighted fragment of a code line. */
export interface HighlightToken {
  text: string;
  /** ANSI color name for the token. */
  color: string;
  italic?: boolean;
}

/** Comment prefixes for common languages; `null` means "no line comments". */
const LINE_COMMENTS: Record<string, string> = {
  js: '//',
  ts: '//',
  tsx: '//',
  jsx: '//',
  java: '//',
  c: '//',
  cpp: '//',
  go: '//',
  rust: '//',
  swift: '//',
  kotlin: '//',
  php: '//',
  py: '#',
  python: '#',
  rb: '#',
  ruby: '#',
  sh: '#',
  bash: '#',
  yaml: '#',
  yml: '#',
  toml: '#',
  ini: '#',
  dockerfile: '#',
  sql: '--',
  lua: '--',
  elixir: '#',
  haskell: '--',
};

/** Languages with `/* ... *\/` block comments. */
const BLOCK_COMMENTS = new Set([
  'js',
  'ts',
  'tsx',
  'jsx',
  'java',
  'c',
  'cpp',
  'go',
  'rust',
  'swift',
  'kotlin',
  'php',
  'css',
  'scss',
]);

/** Programming keywords shared across common languages. */
const KEYWORDS = new Set([
  'if',
  'else',
  'elif',
  'for',
  'while',
  'do',
  'switch',
  'case',
  'break',
  'continue',
  'return',
  'function',
  'fn',
  'def',
  'class',
  'struct',
  'enum',
  'interface',
  'type',
  'const',
  'let',
  'var',
  'import',
  'export',
  'from',
  'as',
  'default',
  'extends',
  'implements',
  'new',
  'delete',
  'typeof',
  'instanceof',
  'in',
  'of',
  'is',
  'not',
  'and',
  'or',
  'try',
  'catch',
  'finally',
  'throw',
  'raise',
  'with',
  'yield',
  'await',
  'async',
  'public',
  'private',
  'protected',
  'static',
  'void',
  'null',
  'undefined',
  'true',
  'false',
  'this',
  'self',
  'super',
  'nil',
  'None',
  'True',
  'False',
]);

const TYPE_NAMES = new Set([
  'string',
  'number',
  'boolean',
  'int',
  'float',
  'double',
  'char',
  'byte',
  'long',
  'short',
  'array',
  'object',
  'record',
  'tuple',
  'list',
  'dict',
  'set',
  'map',
  'String',
  'Number',
  'Boolean',
  'Integer',
  'Float',
  'Double',
  'Character',
  'Object',
  'Array',
  'List',
  'Dict',
  'Set',
  'Map',
  'Promise',
  'Set',
]);

/** Quote characters that start a string literal. */
const STRING_QUOTES = new Set(['"', "'", '`']);

/**
 * Highlight a single line of code.
 *
 * A lightweight scanner covering the common cases: line/block comments,
 * quoted strings, numbers, keywords, type names and identifiers. Language
 * selection only affects the comment syntax; unknown languages fall back to
 * `//` line comments plus `#` (Python-style) detection.
 *
 * @param code - One line of source code.
 * @param language - Optional language tag (e.g. `'ts'`, `'py'`).
 * @returns The highlighted tokens.
 */
export function highlightCode(code: string, language = ''): HighlightToken[] {
  const lang = language.toLowerCase();
  const tokens: HighlightToken[] = [];
  let i = 0;

  const push = (text: string, color: string, italic = false): void => {
    if (text.length === 0) return;
    const last = tokens[tokens.length - 1];
    if (last && last.color === color && last.italic === italic) {
      last.text += text;
    } else {
      tokens.push({ text, color, italic });
    }
  };

  const lineComment = LINE_COMMENTS[lang] ?? (BLOCK_COMMENTS.has(lang) ? '//' : null);

  while (i < code.length) {
    const rest = code.substring(i);

    // Line comment.
    if (lineComment && rest.startsWith(lineComment)) {
      push(rest, 'gray', true);
      break;
    }
    // Block comment (also used for `#`-style when no line comment known).
    if (BLOCK_COMMENTS.has(lang) && rest.startsWith('/*')) {
      const end = code.indexOf('*/', i + 2);
      const length = end === -1 ? code.length - i : end + 2 - i;
      push(code.substring(i, i + length), 'gray', true);
      i += length;
      continue;
    }
    if (!lineComment && rest.startsWith('#')) {
      push(rest, 'gray', true);
      break;
    }

    // String literal.
    if (STRING_QUOTES.has(code[i]!)) {
      const quote = code[i]!;
      let j = i + 1;
      while (j < code.length && code[j] !== quote) {
        if (code[j] === '\\') j++;
        j++;
      }
      if (code[j] === quote) j++;
      push(code.substring(i, j), 'green');
      i = j;
      continue;
    }

    // Number.
    if (/[0-9]/.test(code[i]!)) {
      const match = /^0x[0-9a-fA-F]+|\d+(\.\d+)?/.exec(rest);
      push(match![0], 'cyan');
      i += match![0].length;
      continue;
    }

    // Identifier or keyword.
    if (/[A-Za-z_]/.test(code[i]!)) {
      const match = /[A-Za-z_][A-Za-z0-9_]*/.exec(rest);
      const word = match![0];
      const next = code[i + word.length];
      const isCall = next === '(';
      if (KEYWORDS.has(word)) push(word, 'magenta');
      else if (TYPE_NAMES.has(word)) push(word, 'blue');
      else if (isCall) push(word, 'yellow');
      else push(word, 'white');
      i += word.length;
      continue;
    }

    // Everything else: whitespace, operators, punctuation.
    const match = /[^A-Za-z0-9_'"`#]+/.exec(rest);
    let length = match ? match[0].length : 1;
    // Stop the run before a comment marker so '// x' is not swallowed.
    if (lineComment) {
      const commentAt = rest.indexOf(lineComment);
      if (commentAt >= 0 && commentAt < length) length = commentAt;
    }
    if (length === 0) length = 1;
    push(code.substring(i, i + length), 'white');
    i += length;
  }

  return tokens;
}
