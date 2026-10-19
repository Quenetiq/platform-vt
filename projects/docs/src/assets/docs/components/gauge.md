# Gauge

A compact single-line gauge with an optional label and percentage.

## Usage

```html
<vt-gauge label="CPU" [value]="73" [max]="100" [width]="20"></vt-gauge>
```

## Inputs

| Input | Type | Default | Description |
|---|---|---|---|
| `value` | `number` | `0` | Current value |
| `min` | `number` | `0` | Scale minimum |
| `max` | `number` | `100` | Scale maximum |
| `width` | `number` | `20` | Bar width in cells |
| `label` | `string` | `''` | Text before the bar |
| `showValue` | `boolean` | `true` | Print the percentage |
| `color` | `string` | `'cyan'` | Bar color |
| `filledGlyph` | `string` | `'█'` | Filled cell glyph |
| `emptyGlyph` | `string` | `'░'` | Empty cell glyph |

## Percentage

`percent` normalizes `value` between `min` and `max` and clamps it to 0-100.

## Example

```html
<vt-box flexDirection="column" [gap]="1">
  <vt-gauge label="CPU" [value]="cpu()" color="green"></vt-gauge>
  <vt-gauge label="RAM" [value]="ram()" color="yellow"></vt-gauge>
  <vt-gauge label="Disk" [value]="disk()" color="red"></vt-gauge>
</vt-box>
```
