# Chart

A line or bar chart with axes and a value scale.

## Usage

```html
<vt-chart
  [data]="[3, 8, 5, 9, 2]"
  [labels]="['Mon', 'Tue', 'Wed', 'Thu', 'Fri']"
  kind="bar"
  [height]="8">
</vt-chart>
```

## Inputs

| Input | Type | Default | Description |
|---|---|---|---|
| `data` | `number[]` | — | Values (required) |
| `labels` | `string[]` | `[]` | Bottom axis labels |
| `height` | `number` | `8` | Plot height in rows |
| `min` / `max` | `number \| null` | auto | Scale bounds |
| `kind` | `'line' \| 'bar'` | `'line'` | Chart type |
| `color` | `string` | `'cyan'` | Data color |
| `axisColor` | `string` | `'gray'` | Axis/scale color |

For a compact inline trend, use `vt-sparkline`.
