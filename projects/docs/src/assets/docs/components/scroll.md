# Scroll

A scrollable viewport with vertical and horizontal panning.

## Usage

```html
<vt-scroll [height]="10" (scrollChange)="save($event)">
  @for (line of lines(); track $index) {
    <vt-text [content]="line"></vt-text>
  }
</vt-scroll>
```

## Inputs

| Input | Type | Default | Description |
|---|---|---|---|
| `scrollTop` | `number \| 'bottom'` | `'bottom'` | Vertical offset; `'bottom'` pins to the newest content |
| `scrollLeft` | `number \| 'right'` | `0` | Horizontal offset; `'right'` pins to the end |
| `height` | `number` | — | Viewport height (cells) |
| `horizontal` | `boolean` | `false` | Enable horizontal mouse-wheel panning |
| `wheelScroll` | `boolean` | `true` | Enable wheel scrolling |
| `showScrollbar` | `boolean` | `false` | Show a vertical scrollbar thumb |

## Outputs

| Output | Type | Description |
|---|---|---|
| `scrollChange` | `number \| 'bottom'` | Vertical offset changed |
| `scrollLeftChange` | `number \| 'right'` | Horizontal offset changed |

## Behavior

- New content is pinned to the bottom by default (chat/log style).
- Scrolling up pins the viewport; scrolling back to the bottom re-enables
  bottom pinning.
- Mouse wheel scrolling requires the wheel service (provided by
  `bootstrapTerminal`). Horizontal wheel events (SGR buttons 6/7) pan when
  `[horizontal]="true"`.
- Set `scrollLeft` explicitly for wide content, or `"right"` to pin to the
  end.

## Example

```html
<vt-scroll
  [height]="12"
  [horizontal]="true"
  [scrollLeft]="0"
  (scrollChange)="offset.set($event)">
  <vt-text [content]="wideTable"></vt-text>
</vt-scroll>
```
