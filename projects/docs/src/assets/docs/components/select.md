# Select

Dropdown selection with arrow key navigation.

## Usage

```html
<vt-select [options]="options" (selected)="onSelect($event)"></vt-select>
```

## Inputs

| Input | Type | Default | Description |
|---|---|---|---|
| `options` | `string[]` | `[]` | Available options |
| `value` | `string \| undefined` | `undefined` | Initially selected option |

## Outputs

| Output | Type | Description |
|---|---|---|
| `selected` | `string` | Emitted when an option is selected (Enter key) |

## Keyboard

| Key | Action |
|---|---|
| Up | Move highlight up |
| Down | Move highlight down |
| Enter | Confirm selection |
| Escape | Cancel (revert to previous) |
| Home/End | Jump to first/last option |

## Styling

- **Unfocused**: Normal colors
- **Focused, no selection**: Highlighted option has green background
- **Focused, with selection**: Selected option has green background, highlighted has cyan background

## Examples

### Basic

```html
<vt-select
  [options]="['Apple', 'Banana', 'Cherry']"
  (selected)="onFruit($event)">
</vt-select>
```

### Pre-selected

```html
<vt-select
  [options]="['Small', 'Medium', 'Large']"
  [value]="'Medium'"
  (selected)="onSize($event)">
</vt-select>
```

### In a Form

```html
<vt-box flexDirection="column" [gap]="1">
  <vt-text fontWeight="bold">Choose your adventure:</vt-text>
  <vt-select [options]="adventures" (selected)="startAdventure($event)"></vt-select>
</vt-box>
```
