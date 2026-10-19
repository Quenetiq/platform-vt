# Split View

Two panes with a mouse-draggable divider.

## Usage

```html
<vt-split-view [ratio]="0.4" (ratioChange)="ratio.set($event)" flexGrow="1">
  <vt-box>Sidebar</vt-box>
  <vt-box>Content</vt-box>
</vt-split-view>
```

## Inputs

| Input | Type | Default | Description |
|---|---|---|---|
| `direction` | `'row' \| 'column'` | `'row'` | Side-by-side or stacked |
| `ratio` | `number` | `0.5` | Divider fraction (0–1) |
| `dividerChar` | `string` | auto (`│`/`─`) | Divider glyph |
| `flexGrow` | `number` | `0` | Grow factor for the container |

## Outputs

| Output | Type | Description |
|---|---|---|
| `ratioChange` | `number` | Divider moved |

## Interaction

- Drag the divider with the mouse.
- `Ctrl+Left/Right` (row) or `Ctrl+Up/Down` (column) resize while focused.
- The ratio is clamped so both panes keep at least one cell.
