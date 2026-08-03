# Spacer

Empty space filler for flex layouts.

## Usage

```html
<vt-spacer></vt-spacer>
```

## Description

Renders an empty node that takes up available space in a flex container. Use it to push elements apart in a `row` layout.

## Examples

### Push to Edges

```html
<vt-box flexDirection="row" [width]="40">
  <vt-text>Left</vt-text>
  <vt-spacer></vt-spacer>
  <vt-text>Right</vt-text>
</vt-box>
```

### Equal Spacing

```html
<vt-box flexDirection="row" [width]="60">
  <vt-text>A</vt-text>
  <vt-spacer></vt-spacer>
  <vt-text>B</vt-text>
  <vt-spacer></vt-spacer>
  <vt-text>C</vt-text>
</vt-box>
```
