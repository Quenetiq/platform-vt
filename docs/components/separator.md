# Separator

Horizontal line separator.

## Usage

```html
<vt-separator></vt-separator>
```

## Description

Renders a single horizontal line spanning the full terminal width using `─` characters. Useful as a visual divider between sections.

## Styling

- **Color**: Default (inherits from parent context)
- **Character**: `─` (box drawing horizontal)

## Examples

### Section Divider

```html
<vt-box flexDirection="column" [padding]="1" border="single">
  <vt-text fontWeight="bold">Section 1</vt-text>
  <vt-text>Content here</vt-text>
  <vt-separator></vt-separator>
  <vt-text fontWeight="bold">Section 2</vt-text>
  <vt-text>More content</vt-text>
</vt-box>
```

### With Color

```html
<vt-box color="gray">
  <vt-separator></vt-separator>
</vt-box>
```
