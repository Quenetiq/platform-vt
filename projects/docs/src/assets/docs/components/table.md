# Table

A bordered data table with sorting, filtering, multi-select, column
resizing/reordering and row virtualization.

## Usage

```html
<vt-table
  [columns]="['Name', 'Size']"
  [rows]="items()"
  [sortable]="true"
  [filter]="query()"
  (selectedChange)="select($event)">
</vt-table>
```

## Inputs

| Input | Type | Default | Description |
|---|---|---|---|
| `columns` | `string[]` | — | Column headers (required) |
| `rows` | `string[][]` | — | Row data (required) |
| `border` | `boolean` | `true` | Draw box borders |
| `sortable` | `boolean` | `false` | Header clicks / arrows sort |
| `sort` | `TableSort \| null` | `null` | Applied sort |
| `viewportRows` | `number` | `10` | Virtualization window |
| `selectable` | `boolean` | `true` | Allow row selection |
| `filter` | `string` | `''` | Case-insensitive filter across all cells |
| `multiSelect` | `boolean` | `false` | Space toggles rows |
| `resizable` | `boolean` | `false` | `Ctrl+←/→` resizes the active column |
| `reorderable` | `boolean` | `false` | `Alt+←/→` moves the active column |
| `stickyHeader` | `boolean` | `true` | Keep the header visible while scrolling |
| `minColumnWidth` | `number` | `3` | Minimum content width |

## Outputs

| Output | Type | Description |
|---|---|---|
| `sortChange` | `TableSort \| null` | Sort column/direction changed |
| `selectedChange` | `number` | Active row's original index |
| `selectionChange` | `number[]` | Selected original indices (multi-select) |
| `columnWidthsChange` | `number[]` | Column widths after a resize |
| `columnOrderChange` | `number[]` | New column order (original indices) |

## Keyboard

| Key | Action |
|---|---|
| Up / Down | Move the active row |
| PageUp / PageDown | Move by one viewport |
| Home / End | First / last row |
| Space | Toggle the active row (multi-select) |
| Ctrl+Left/Right | Shrink/grow the active column |
| Alt+Left/Right | Move the active column |
| Left / Right | Sort by the previous/next column |

## Filtering and indices

`filter` matches any cell. Outputs report the row's **original index** in the
`rows` input, so selection stays stable across sorting and filtering.

## Example

```html
<vt-table
  [columns]="['File', 'Size', 'Status']"
  [rows]="files()"
  [sortable]="true"
  [filter]="query()"
  [multiSelect]="true"
  [resizable]="true"
  [reorderable]="true"
  (selectionChange)="selectedRows.set($event)">
</vt-table>
```
