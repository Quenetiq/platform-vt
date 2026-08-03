# Checkbox

Toggle checkbox with Space key.

## Usage

```html
<vt-checkbox label="Enable notifications" (changed)="onToggle($event)"></vt-checkbox>
```

## Inputs

| Input | Type | Default | Description |
|---|---|---|---|
| `label` | `string` | `'Toggle'` | Checkbox label |
| `checked` | `boolean` | `false` | Initial state |

## Outputs

| Output | Type | Description |
|---|---|---|
| `changed` | `boolean` | Emitted when state changes |

## Keyboard

| Key | Action |
|---|---|
| Space | Toggle state |

## Styling

- **Unchecked**: `[ ]`
- **Checked**: `[✓]`
- **Focused**: Green text when checked, normal when unchecked

## Examples

### Basic

```html
<vt-checkbox label="I agree" (changed)="agree.set($event)"></vt-checkbox>
```

### Pre-checked

```html
<vt-checkbox label="Dark mode" [checked]="true" (changed)="toggleDark($event)"></vt-checkbox>
```
