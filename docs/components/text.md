# Text

Renders static or dynamic text content.

## Usage

```html
<vt-text color="green" fontWeight="bold">Hello, World!</vt-text>
<vt-text>{{ greeting() }}</vt-text>
```

## Inputs

| Input | Type | Default | Description |
|---|---|---|---|
| `content` | `string \| undefined` | `undefined` | Text content (alternative to content projection) |
| `color` | `Color` | `undefined` | Foreground color |
| `backgroundColor` | `Color` | `undefined` | Background color |
| `fontWeight` | `'normal' \| 'bold'` | `'normal'` | Bold text |
| `fontStyle` | `'normal' \| 'italic'` | `'normal'` | Italic text |
| `textDecoration` | `'none' \| 'underline'` | `'none'` | Underline |
| `width` | `number \| string` | `'auto'` | Fixed width |
| `height` | `number \| string` | `'auto'` | Fixed height |
| `padding` | `number \| string` | `0` | Padding (CSS shorthand) |
| `margin` | `number \| string` | `0` | Margin (CSS shorthand) |

## Colors

Named colors map to ANSI codes:

```
black, red, green, yellow, blue, magenta, cyan, white,
bright-black, bright-red, bright-green, bright-yellow,
bright-blue, bright-magenta, bright-cyan, bright-white
```

24-bit RGB colors are also supported: `"rgb(255,128,0)"`

## Examples

### Styled Text

```html
<vt-text color="cyan" fontWeight="bold">System</vt-text>
<vt-text color="bright-yellow">Warning:</vt-text>
<vt-text> Normal text</vt-text>
```

### Dynamic Content

```html
<vt-text>{{ status() }}</vt-text>
<vt-text>Count: {{ count() }}</vt-text>
<vt-text color="green">{{ count() > 0 ? 'Active' : 'Inactive' }}</vt-text>
```

### Fixed Width

```html
<vt-text [width]="20" color="cyan">Label:</vt-text>
<vt-text>Value goes here</vt-text>
```
