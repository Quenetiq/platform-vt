# Layout System

`@quenetiq/platform-vt` uses a custom flexbox layout engine that mirrors CSS Flexbox semantics, adapted for the terminal grid (columns × rows).

## Flexbox Container

Any `<vt-box>` with children is automatically a flex container. Control layout with:

| Property | Type | Default | Description |
|---|---|---|---|
| `flexDirection` | `'row' \| 'column'` | `'row'` | Main axis direction |
| `justifyContent` | string | `'flex-start'` | Main-axis distribution |
| `alignItems` | string | `'stretch'` | Cross-axis alignment |
| `gap` | `number` | `0` | Space between children |
| `width` | `number \| 'auto'` | `'auto'` | Explicit width |
| `height` | `number \| 'auto'` | `'auto'` | Explicit height |

## Direction

```html
<!-- Row: children side by side (default) -->
<vt-box flexDirection="row">
  <vt-text>Left</vt-text>
  <vt-text>Right</vt-text>
</vt-box>

<!-- Column: children stacked vertically -->
<vt-box flexDirection="column">
  <vt-text>Top</vt-text>
  <vt-text>Bottom</vt-text>
</vt-box>
```

## Justify Content

Controls how children are distributed along the main axis:

```html
<!-- Equal spacing around each child -->
<vt-box flexDirection="row" justifyContent="space-around" [width]="60">
  <vt-text>A</vt-text>
  <vt-text>B</vt-text>
  <vt-text>C</vt-text>
</vt-box>

<!-- Space between first and last -->
<vt-box flexDirection="row" justifyContent="space-between" [width]="60">
  <vt-text>Start</vt-text>
  <vt-text>End</vt-text>
</vt-box>
```

| Value | Behavior |
|---|---|
| `'flex-start'` | Pack toward start (default) |
| `'center'` | Center children |
| `'flex-end'` | Pack toward end |
| `'space-between'` | Equal space between children |
| `'space-around'` | Equal space around each child |
| `'space-evenly'` | Equal space including edges |

## Align Items

Controls cross-axis alignment:

```html
<!-- Center vertically in a row -->
<vt-box flexDirection="row" alignItems="center" [height]="10">
  <vt-text>Centered</vt-text>
</vt-box>

<!-- Stretch children to fill height -->
<vt-box flexDirection="row" alignItems="stretch" [height]="5">
  <vt-text color="red">Full height</vt-text>
</vt-box>
```

| Value | Behavior |
|---|---|
| `'flex-start'` | Align to cross-axis start |
| `'center'` | Center on cross-axis |
| `'flex-end'` | Align to cross-axis end |
| `'stretch'` | Stretch to fill (default) |

## Gap

```html
<vt-box flexDirection="row" [gap]="2">
  <vt-text>A</vt-text>
  <vt-text>B</vt-text>
  <vt-text>C</vt-text>
</vt-box>
```

Gap adds empty columns (row) or rows (column) between children.

## Padding & Margin

```html
<!-- Uniform padding -->
<vt-box [padding]="2">...</vt-box>

<!-- Per-side padding (CSS shorthand) -->
<vt-box padding="1 2 3 4">...</vt-box>  <!-- top right bottom left -->
<vt-box padding="1 2">...</vt-box>      <!-- vertical horizontal -->

<!-- Individual sides -->
<vt-box [paddingTop]="1" [paddingLeft]="3">...</vt-box>

<!-- Margin works identically -->
<vt-box [margin]="1">...</vt-box>
```

## Flex Grow / Shrink

Children can grow to fill free space or shrink to fit:

```html
<vt-box flexDirection="row" [width]="40">
  <vt-text [style.flex-grow]="1">Grows</vt-text>
  <vt-text>Fixed</vt-text>
</vt-box>
```

## Fixed Dimensions

```html
<vt-box [width]="30" [height]="10" border="single">
  <vt-text>30×10 box</vt-text>
</vt-box>
```

## Spacing Shorthand

Padding and margin accept CSS-style shorthand strings:

| Format | Meaning |
|---|---|
| `"1"` | All sides = 1 |
| `"1 2"` | Vertical = 1, Horizontal = 2 |
| `"1 2 3 4"` | Top = 1, Right = 2, Bottom = 3, Left = 4 |

## Complete Example

```html
<vt-box flexDirection="column" [gap]="1" [padding]="1" border="double">
  <vt-box flexDirection="row" justifyContent="space-between" alignItems="center">
    <vt-text color="cyan" fontWeight="bold">Dashboard</vt-text>
    <vt-text color="gray">v1.0</vt-text>
  </vt-box>

  <vt-separator></vt-separator>

  <vt-box flexDirection="row" [gap]="2">
    <vt-box flexDirection="column" [width]="20" [padding]="1" border="single">
      <vt-text fontWeight="bold">Users</vt-text>
      <vt-text color="green">1,234</vt-text>
    </vt-box>
    <vt-box flexDirection="column" [width]="20" [padding]="1" border="single">
      <vt-text fontWeight="bold">Revenue</vt-text>
      <vt-text color="yellow">$5,678</vt-text>
    </vt-box>
  </vt-box>
</vt-box>
```
