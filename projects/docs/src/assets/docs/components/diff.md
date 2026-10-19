# Diff

Line-based diff rendering with colored additions and deletions.

## Usage

```html
<vt-diff [oldText]="before()" [newText]="after()"></vt-diff>
```

## Inputs

| Input | Type | Default | Description |
|---|---|---|---|
| `oldText` | `string` | — | Original text (required) |
| `newText` | `string` | — | New text (required) |
| `addColor` | `string` | `'green'` | Added lines |
| `delColor` | `string` | `'red'` | Removed lines |
| `sameColor` | `string` | `''` | Unchanged lines |

The diff uses an LCS algorithm; only changed lines are emitted with `+`/`-`
prefixes. Use `diffLines()` directly when you need the raw result.
