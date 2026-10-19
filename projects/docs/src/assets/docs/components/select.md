# Select

Single- or multi-select control with filtering and type-ahead.

## Usage

```html
<vt-select [options]="options" (valueChange)="onIndex($event)"></vt-select>
```

`valueChange` emits the selected **option index**. Use `options[value()]` (or
the `value` input) to read the label.

## Inputs

| Input | Type | Default | Description |
|---|---|---|---|
| `options` | `string[]` | — | Available options (required) |
| `value` | `number` | `0` | Selected option index (single mode) |
| `multiple` | `boolean` | `false` | Allow several selected options |
| `filterable` | `boolean` | `false` | Typing narrows the option list |
| `dropdown` | `boolean` | `false` | Expand an inline listbox |
| `maxVisibleOptions` | `number` | `8` | Option rows rendered by the dropdown |
| `placeholder` | `string` | `'Select...'` | Text shown when a multi-select is empty |
| `autofocus` | `boolean` | `false` | Focus on mount |

## Outputs

| Output | Type | Description |
|---|---|---|
| `valueChange` | `number` | Selected index (single mode) |
| `selectionChange` | `number[]` | Selected indices (multiple mode) |

## Keyboard

| Key | Action |
|---|---|
| Up / Down | Move the active option |
| Home / End | Jump to the first/last option |
| Enter | Confirm (single) / toggle (multiple) |
| Space | Toggle the active option (multiple) |
| Esc | Clear the filter |
| Printable keys | Filter (when `filterable`) or type-ahead |

## Examples

### Inline dropdown

```html
<vt-select
  [options]="['Small', 'Medium', 'Large']"
  [dropdown]="true"
  (valueChange)="size.set($event)">
</vt-select>
```

`Enter`/`Space` opens the list, arrows move the highlight, `Enter` selects,
and `Esc` closes it. With `filterable`, typing filters the visible options.

### Single select with filtering

```html
<vt-select
  [options]="['Apple', 'Banana', 'Cherry']"
  [filterable]="true"
  (valueChange)="fruit.set(options[$event])">
</vt-select>
```

### Multi-select

```html
<vt-select
  [options]="tags"
  [multiple]="true"
  (selectionChange)="selected.set($event)">
</vt-select>
```

### Type-ahead

Without `filterable`, typing jumps to the first option with the given prefix.

```html
<vt-select [options]="countries" (valueChange)="pick($event)"></vt-select>
```

## In a form

`vt-form-field` tracks the selected index (single) or the joined labels
(multiple) automatically.
