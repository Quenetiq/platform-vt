# Badge

A compact status pill for inline state.

## Usage

```html
<vt-badge label="Deployed" variant="success"></vt-badge>
<vt-badge label="Degraded" variant="warning" [dot]="false"></vt-badge>
```

## Inputs

| Input | Type | Default | Description |
|---|---|---|---|
| `label` | `string` | — | Badge text (required) |
| `variant` | `'info' \| 'success' \| 'warning' \| 'danger' \| 'neutral'` | `'neutral'` | Color variant |
| `dot` | `boolean` | `true` | Prefix a `●` glyph |

Badges are single-line; use `vt-statusbar`, `vt-box` or flex layout to place
them next to other content.
