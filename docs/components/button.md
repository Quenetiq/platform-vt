# Button

Clickable button with label and focus styling.

## Usage

```html
<vt-button label="Submit" (clicked)="onSubmit()"></vt-button>
```

## Inputs

| Input | Type | Default | Description |
|---|---|---|---|
| `label` | `string` | `'Button'` | Button text |

## Outputs

| Output | Type | Description |
|---|---|---|
| `clicked` | `void` | Emitted when Enter is pressed while focused |

## Keyboard

| Key | Action |
|---|---|
| Enter | Emit `clicked` |
| Space | Emit `clicked` |

## Styling

When focused, the button renders with inverse colors (background becomes foreground, foreground becomes background).

## Examples

### Basic

```html
<vt-button label="OK" (clicked)="confirm()"></vt-button>
```

### In a Row

```html
<vt-box flexDirection="row" [gap]="1">
  <vt-button label="Save" (clicked)="save()"></vt-button>
  <vt-button label="Cancel" (clicked)="cancel()"></vt-button>
</vt-box>
```
