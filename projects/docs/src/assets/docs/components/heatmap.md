# Heatmap

A matrix heatmap with optional row/column labels and a color scale.

## Usage

```html
<vt-heatmap
  [data]="[[1, 2, 3], [4, 5, 6]]"
  [rowLabels]="['Mon', 'Tue']"
  [columnLabels]="['00', '06', '12']">
</vt-heatmap>
```

## Inputs

| Input | Type | Default | Description |
|---|---|---|---|
| `data` | `number[][]` | `[]` | Matrix values |
| `rowLabels` | `string[]` | `[]` | Labels left of each row |
| `columnLabels` | `string[]` | `[]` | Labels above the columns |
| `min` / `max` | `number \| null` | auto | Explicit scale bounds |
| `palette` | `string[]` | gray→red | Colors from low to high |
| `cellWidth` | `number` | `1` | Glyphs per cell |
| `glyph` | `string` | `'█'` | Cell glyph |

## Scaling

Values are normalized to `[0, 1]` and mapped into the palette. When `min`
and `max` are omitted, the data bounds are used; equal bounds fall back to a
one-unit range.

## Example

```typescript
readonly activity = [
  [0, 2, 5, 8, 3],
  [1, 6, 9, 4, 2],
  [0, 1, 3, 2, 0],
];
```

```html
<vt-heatmap
  [data]="activity"
  [rowLabels]="['Mon', 'Tue', 'Wed']"
  [columnLabels]="['00', '06', '12', '18', '23']">
</vt-heatmap>
```
