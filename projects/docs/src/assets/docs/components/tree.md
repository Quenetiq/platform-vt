# Tree

A navigable tree with expand/collapse, checkboxes, lazy children and filtering.

## Usage

```html
<vt-tree
  [nodes]="tree()"
  [checkboxes]="true"
  [filter]="query()"
  [loadChildren]="load"
  (selected)="current.set($event)"
  (selectionChange)="checked.set($event)">
</vt-tree>
```

## Node shape

```typescript
interface TreeNode {
  label: string;
  children?: TreeNode[];
  expanded?: boolean; // defaults to true
}
```

Omit `children` to enable lazy loading through `loadChildren`.

## Inputs

| Input | Type | Default | Description |
|---|---|---|---|
| `nodes` | `TreeNode[]` | — | Root nodes (required) |
| `multiSelect` | `boolean` | `false` | Track several checked nodes |
| `checkboxes` | `boolean` | `false` | Render `[ ]` / `[x]` (implies multi-select) |
| `filter` | `string` | `''` | Case-insensitive label filter |
| `loadChildren` | `(node) => Promise<TreeNode[]>` | `null` | Lazy loader |
| `vim` | `boolean` | `false` | `j`/`k` navigation |
| `autofocus` | `boolean` | `false` | Focus on mount |

## Outputs

| Output | Type | Description |
|---|---|---|
| `selected` | `TreeNode` | Active row changed |
| `selectionChange` | `TreeNode[]` | Checked nodes changed |

## Keyboard

| Key | Action |
|---|---|
| Up / Down | Move the active row |
| Left | Collapse, or move to the parent |
| Right | Expand, or move to the first child |
| Enter | Toggle expansion |
| Space | Toggle the checkbox |

## Filtering

A non-empty `filter` shows matching nodes and their ancestors, ignoring the
expansion state. Connector glyphs and indentation are preserved.

## Methods

| Method | Description |
|---|---|
| `toggleChecked(node)` | Toggle one node |
| `checkAllVisible()` | Check every visible row |
| `clearChecked()` | Clear the checked set |

## Example

```typescript
readonly tree: TreeNode[] = [
  { label: 'src', children: [{ label: 'main.ts' }, { label: 'app.ts' }] },
  { label: 'README.md' },
];
```
