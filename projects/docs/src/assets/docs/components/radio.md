# Radio & Toggle

Mutually exclusive options and boolean switches.

## Radio group

```html
<vt-radio-group [value]="size()" (valueChange)="size.set($event)">
  <vt-radio [checked]="size() === 's'" value="s" label="Small"></vt-radio>
  <vt-radio [checked]="size() === 'm'" value="m" label="Medium"></vt-radio>
  <vt-radio [checked]="size() === 'l'" value="l" label="Large"></vt-radio>
</vt-radio-group>
```

| Radio input | Type | Description |
|---|---|---|
| `value` | `string` | Value emitted when chosen |
| `label` | `string` | Visible label |
| `checked` | `boolean` | Selected state |
| `autofocus` | `boolean` | Focus on mount |

`vt-radio-group` exposes `value` and `valueChange`; arrow keys move the
selection within the group, Space/Enter selects.

## Toggle

```html
<vt-toggle label="Enable cache" [checked]="cache()" (checkedChange)="cache.set($event)">
</vt-toggle>
```

| Input | Type | Default | Description |
|---|---|---|---|
| `label` | `string` | `''` | Switch label |
| `checked` | `boolean` | `false` | Current state |
| `autofocus` | `boolean` | `false` | Focus on mount |

| Output | Type | Description |
|---|---|---|
| `checkedChange` | `boolean` | State toggled |

Space/Enter toggles the switch. `checked` is a writable signal for
programmatic changes.
