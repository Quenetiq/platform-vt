# ANSI Text

Render text that already contains ANSI SGR color/style codes (for example
captured CLI output).

## Usage

```html
<vt-ansi-text [content]="commandOutput()" [wrap]="true"></vt-ansi-text>
```

## Inputs

| Input | Type | Default | Description |
|---|---|---|---|
| `content` | `string` | — | Text with SGR sequences (required) |
| `wrap` | `boolean` | `false` | Wrap long lines |

Supported: 16 basic colors, 256-color (`38;5;n`), truecolor
(`38;2;r;g;b`), bold, dim, italic, underline, strikethrough and reset.

**Security:** this component is trusted-input only. It interprets ANSI
sequences by design; OSC/control characters are still stripped at the paint
boundary, but you should not feed it arbitrary untrusted terminal output.
