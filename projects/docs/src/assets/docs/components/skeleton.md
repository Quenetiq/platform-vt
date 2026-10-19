# Skeleton

Pulsing placeholder bars shown while data loads.

## Usage

```html
<vt-skeleton [lines]="4" [width]="40" color="gray"></vt-skeleton>
```

## Inputs

| Input | Type | Default | Description |
|---|---|---|---|
| `lines` | `number` | `3` | Number of bars |
| `width` | `number \| null` | full width | Bar width in cells |
| `pulse` | `boolean` | `true` | Dim/normal pulse animation |
| `pulseMs` | `number` | `800` | Pulse interval |
| `color` | `string` | `'gray'` | Bar color |

The pulse timer is cleaned up when the component is destroyed. For a
spinner, use `vt-spinner`.
