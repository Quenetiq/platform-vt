# Sparkline

A compact inline trend indicator.

## Usage

```html
<vt-sparkline [data]="requestsPerMinute()" type="bar"></vt-sparkline>
```

## Inputs

| Input | Type | Default | Description |
|---|---|---|---|
| `data` | `number[]` | — | Values (required) |
| `type` | `'bar' \| 'line'` | `'bar'` | Render style |
| `width` | `number \| 'auto'` | `'auto'` | Width in cells |
| `max` | `number \| null` | auto | Explicit maximum |
| `fillColor` | `string` | `''` | Bar/line color |

Sparklines render in one row and are ideal for status bars and dashboards.
