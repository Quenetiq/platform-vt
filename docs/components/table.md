# Table

Fixed-width table with headers and rows.

## Usage

```html
<vt-table [headers]="headers" [rows]="rows"></vt-table>
```

## Inputs

| Input | Type | Default | Description |
|---|---|---|---|
| `headers` | `string[]` | `[]` | Column headers |
| `rows` | `string[][]` | `[]` | Table data rows |
| `columnWidths` | `number[] \| undefined` | `undefined` | Fixed column widths |

## Layout

The table auto-calculates column widths based on content if `columnWidths` is not provided. Each column is padded and separated by `│` characters. Rows are separated by horizontal rules.

## Styling

- **Headers**: Bold, cyan background
- **Rows**: Default colors
- **Borders**: Single-line box drawing characters

## Examples

### Basic

```html
<vt-table
  [headers]="['Name', 'Age', 'City']"
  [rows]="[
    ['Alice', '30', 'New York'],
    ['Bob', '25', 'London'],
    ['Charlie', '35', 'Tokyo']
  ]">
</vt-table>
```

### Fixed Widths

```html
<vt-table
  [headers]="['ID', 'Status', 'Description']"
  [rows]="rows()"
  [columnWidths]="[8, 12, 40]">
</vt-table>
```
