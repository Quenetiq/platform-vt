# Input

Single-line text input with cursor and key handling.

## Usage

```html
<vt-input placeholder="Enter your name" (submitted)="onSubmit($event)"></vt-input>
```

## Inputs

| Input | Type | Default | Description |
|---|---|---|---|
| `placeholder` | `string` | `'Type something...'` | Placeholder text |
| `value` | `string` | `''` | Initial value |
| `maxLength` | `number` | `Infinity` | Maximum character count |

## Outputs

| Output | Type | Description |
|---|---|---|
| `submitted` | `string` | Emitted when Enter is pressed |
| `valueChanged` | `string` | Emitted on every keystroke |

## Keyboard

| Key | Action |
|---|---|
| Printable chars | Append to value |
| Backspace | Delete last character |
| Enter | Submit value |
| Left/Right | Move cursor |
| Home/End | Move to start/end |

## Examples

### Basic Input

```html
<vt-input placeholder="Username" (submitted)="login($event)"></vt-input>
```

### Controlled Input

```html
<vt-input
  [value]="searchTerm()"
  placeholder="Search..."
  [maxLength]="50"
  (valueChanged)="searchTerm.set($event)"
  (submitted)="doSearch($event)">
</vt-input>
```
