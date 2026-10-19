# Textarea

Multiline text input with optional vim mode and multi-cursor editing.

## Usage

```html
<vt-textarea
  [value]="text()"
  [rows]="6"
  (valueChange)="text.set($event)"
  (submitted)="send($event)">
</vt-textarea>
```

## Inputs

| Input | Type | Default | Description |
|---|---|---|---|
| `value` | `string` | `''` | Initial text |
| `placeholder` | `string` | `''` | Placeholder when empty |
| `rows` | `number` | `5` | Visible rows |
| `maxLength` | `number` | `9999` | Maximum characters |
| `vim` | `boolean` | `false` | Vim normal/insert mode |
| `maxCursors` | `number` | `8` | Limit for multi-cursor editing |
| `autofocus` | `boolean` | `false` | Focus on mount |

## Outputs

| Output | Type | Description |
|---|---|---|
| `valueChange` | `string` | Text changed |
| `submitted` | `string` | Ctrl+Enter / submit |

## Vim mode

Normal mode supports `h/j/k/l`, `w/b`, `0/$`, `x`, `dd`, `i/a/I/A/o/O`;
`vimMode()` exposes the current mode. Insert mode edits normally.

## Multi-cursor

`Ctrl+Alt+Up/Down` adds cursors; insert/backspace/delete apply at every
cursor. `extraCursors()` exposes the cursor positions and `maxCursors`
limits how many can be added.

## Undo

`Ctrl+Z` / `Ctrl+Y` (and `u` in vim normal mode) use the built-in undo stack;
`canUndo()` / `canRedo()` report availability.
