# Tabs

A horizontal tab bar with keyboard navigation.

## Usage

```html
<vt-tabs
  [tabs]="['Overview', 'Logs', 'Settings']"
  [active]="tab()"
  (activeChange)="tab.set($event)">
</vt-tabs>
```

## Inputs

| Input | Type | Default | Description |
|---|---|---|---|
| `tabs` | `string[]` | — | Tab labels (required) |
| `active` | `number` | `0` | Active tab index |
| `vim` | `boolean` | `false` | `h`/`l` navigation |
| `autofocus` | `boolean` | `false` | Focus on mount |

## Outputs

| Output | Type | Description |
|---|---|---|
| `activeChange` | `number` | Active tab changed |

## Keyboard

| Key | Action |
|---|---|
| Left / Right | Previous/next tab |
| Home / End | First/last tab |
| Enter | Confirm the active tab |

Render the active panel yourself with `@if`/`@switch` on the `active` value;
`vt-tabs` only draws the bar.
