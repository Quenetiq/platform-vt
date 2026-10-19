# Slider

A numeric value selected with the arrow keys.

## Usage

```html
<vt-slider
  label="Volume"
  [value]="volume()"
  [min]="0"
  [max]="100"
  [step]="5"
  [width]="20"
  (valueChange)="volume.set($event)">
</vt-slider>
```

## Inputs

| Input | Type | Default | Description |
|---|---|---|---|
| `value` | `number` | `0` | Current value |
| `min` / `max` | `number` | `0` / `100` | Range |
| `step` | `number` | `1` | Increment |
| `width` | `number` | `20` | Track width in cells |
| `label` | `string` | `''` | Label before the track |
| `autofocus` | `boolean` | `false` | Focus on mount |

## Outputs

| Output | Type | Description |
|---|---|---|
| `valueChange` | `number` | Value changed |

## Keyboard

| Key | Action |
|---|---|
| Left / Down | Decrease by `step` |
| Right / Up | Increase by `step` |
| Home / End | Minimum / maximum |
