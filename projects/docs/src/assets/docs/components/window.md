# Window

A floating, draggable and resizable window with a title bar and z-order.

## Usage

```html
<vt-window title="Settings" [x]="4" [y]="2" [width]="40" [height]="12"
  (closed)="settingsOpen.set(false)">
  <vt-text content="Window content"></vt-text>
</vt-window>
```

## Inputs

| Input | Type | Default | Description |
|---|---|---|---|
| `title` | `string` | `'Window'` | Title bar text |
| `x` / `y` | `number` | `0` | Initial position (columns/rows) |
| `width` / `height` | `number` | `40` / `12` | Window size |
| `draggable` | `boolean` | `true` | Drag by the title bar |
| `resizable` | `boolean` | `true` | `Ctrl+arrows` resize |
| `closable` | `boolean` | `true` | Show the ✕ affordance |
| `minWidth` / `minHeight` | `number` | `12` / `4` | Minimum size |
| `color` / `background` | `string` | `''` | Theme overrides |

## Outputs

| Output | Type | Description |
|---|---|---|
| `closed` | `void` | Close affordance activated |
| `boundsChange` | `WindowBounds` | After a drag or resize |

## Methods

| Method | Description |
|---|---|
| `moveTo(x, y)` | Move and clamp to the terminal viewport |
| `moveBy(dx, dy)` | Move by a delta |
| `resizeBy(dx, dy)` | Resize with minimum/screen clamping |
| `bringToFront()` | Re-append as the last absolute sibling |
| `close()` | Emit `closed` |

## Behavior

- Dragging the title bar calls `bringToFront()` automatically.
- Clicking anywhere in the window brings it to the front and focuses it.
- The body is a scroll viewport; mouse wheel scrolling works when
  `WheelService` is provided (default in `bootstrapTerminal`).
- `Ctrl+Left/Right` and `Ctrl+Up/Down` resize the focused window.

## Example

```html
<vt-window title="Logs" [x]="0" [y]="0" [width]="60" [height]="14">
  <vt-log-viewer [lines]="logs()" [height]="10"></vt-log-viewer>
</vt-window>
```
