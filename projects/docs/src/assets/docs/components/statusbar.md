# Status Bar

A full-width bottom bar with left, center and right sections.

## Usage

```html
<vt-statusbar
  left="NORMAL"
  [center]="file()"
  right="Ln 12, Col 4"
  backgroundColor="blue">
</vt-statusbar>
```

## Inputs

| Input | Type | Default | Description |
|---|---|---|---|
| `left` | `string` | `''` | Left-aligned text |
| `center` | `string` | `''` | Centered text |
| `right` | `string` | `''` | Right-aligned text |
| `backgroundColor` | `string` | `'gray'` | Bar background |
| `color` | `string` | `'bright-white'` | Text color |

Place it as the last child of a column layout (optionally with `flexGrow` on
the content above) to pin it to the bottom of the screen.
