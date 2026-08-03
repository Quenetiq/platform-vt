# Newline

Forces a line break in the terminal output.

## Usage

```html
<vt-newline></vt-newline>
```

## Description

Inserts a blank line (`\n`) at the current position. Useful for spacing between sections in a terminal layout.

## Examples

### Basic Spacing

```html
<vt-text>First line</vt-text>
<vt-newline></vt-newline>
<vt-text>Third line (with blank line above)</vt-text>
```

### Multiple Lines

```html
<vt-text>Before</vt-text>
<vt-newline></vt-newline>
<vt-newline></vt-newline>
<vt-text>After (two blank lines above)</vt-text>
```
