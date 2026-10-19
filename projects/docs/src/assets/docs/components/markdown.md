# Markdown

Render markdown with headings, inline styles, code blocks and quotes.

## Usage

```html
<vt-markdown [content]="readme()"></vt-markdown>
```

## Inputs

| Input | Type | Default | Description |
|---|---|---|---|
| `content` | `string` | — | Markdown source (required) |
| `highlight` | `boolean` | `true` | Syntax-highlight fenced code |
| `headingColor` | `string` | `'bright-white'` | Heading color |
| `quoteColor` | `string` | `'yellow'` | Blockquote color |
| `codeColor` | `string` | `'cyan'` | Inline code color |

## Supported syntax

ATX headings (`#`–`######`), `**bold**`, `*italic*`, `__bold__`, inline
`` `code` ``, fenced code blocks,
blockquotes (`>`), horizontal rules, and plain lists.

Untrusted content is sanitized at the paint boundary; ANSI/OSC sequences in
the source are stripped. For pre-rendered ANSI output, use `vt-ansi-text`.
