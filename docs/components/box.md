# Box

The `<vt-box>` component is the primary container. It acts as a flex container when it has children.

## Usage

```html
<vt-box flexDirection="column" [gap]="1" [padding]="1" border="single">
  <vt-text>Title</vt-text>
  <vt-text>Content</vt-text>
</vt-box>
```

## Inputs

| Input | Type | Default | Description |
|---|---|---|---|
| `flexDirection` | `'row' \| 'column'` | `'row'` | Main axis direction |
| `justifyContent` | `FlexJustify` | `'flex-start'` | Main-axis distribution |
| `alignItems` | `FlexAlign` | `'stretch'` | Cross-axis alignment |
| `gap` | `number \| string` | `0` | Space between children |
| `width` | `number \| string` | `'auto'` | Explicit width |
| `height` | `number \| string` | `'auto'` | Explicit height |
| `flexGrow` | `number \| string` | `0` | Flex grow factor |
| `flexShrink` | `number \| string` | `1` | Flex shrink factor |
| `padding` | `number \| string` | `0` | Inner padding (CSS shorthand) |
| `paddingTop` | `number` | `0` | Top padding |
| `paddingRight` | `number` | `0` | Right padding |
| `paddingBottom` | `number` | `0` | Bottom padding |
| `paddingLeft` | `number` | `0` | Left padding |
| `margin` | `number \| string` | `0` | Outer margin (CSS shorthand) |
| `marginTop` | `number` | `0` | Top margin |
| `marginRight` | `number` | `0` | Right margin |
| `marginBottom` | `number` | `0` | Bottom margin |
| `marginLeft` | `number` | `0` | Left margin |
| `border` | `'none' \| 'single' \| 'double' \| 'round' \| 'bold'` | `'none'` | Border style |
| `borderColor` | `Color` | `undefined` | Border color |

## Styling

Box supports ANSI style inputs mapped to VTNode styles:

| Input | VTNode Style |
|---|---|
| `color` | `color` |
| `backgroundColor` | `background-color` |
| `bold` | `font-weight: bold` |
| `italic` | `font-style: italic` |
| `underline` | `text-decoration: underline` |

## Examples

### Horizontal Layout

```html
<vt-box flexDirection="row" [gap]="2">
  <vt-text>Left</vt-text>
  <vt-text>Center</vt-text>
  <vt-text>Right</vt-text>
</vt-box>
```

### Centered Content

```html
<vt-box justifyContent="center" alignItems="center" [width]="40" [height]="10" border="single">
  <vt-text>Centered in a 40×10 box</vt-text>
</vt-box>
```

### Nested Layout

```html
<vt-box flexDirection="column" [gap]="1" border="single" [padding]="1">
  <vt-text fontWeight="bold">Header</vt-text>
  <vt-box flexDirection="row" [gap]="1">
    <vt-box [width]="20" border="single">Left Panel</vt-box>
    <vt-box [flexGrow]="1" border="single">Main Content</vt-box>
  </vt-box>
</vt-box>
```
