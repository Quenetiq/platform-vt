# Breadcrumb

A single-line navigation trail with clickable segments.

## Usage

```html
<vt-breadcrumb
  [items]="['Home', 'Projects', 'platform-vt']"
  (itemClick)="navigate($event)">
</vt-breadcrumb>
```

## Inputs

| Input | Type | Default | Description |
|---|---|---|---|
| `items` | `string[]` | `[]` | Segments from root to current |
| `separator` | `string` | `'›'` | Separator glyph |
| `color` | `string` | `'gray'` | Non-active segment color |
| `activeColor` | `string` | `'bright-white'` | Current segment color |

## Outputs

| Output | Type | Description |
|---|---|---|
| `itemClick` | `number` | Clicked segment index |

The last segment is rendered bold and highlighted as the current location.

## Example

```html
<vt-breadcrumb
  [items]="path()"
  (itemClick)="open(path()[$event])">
</vt-breadcrumb>
```
