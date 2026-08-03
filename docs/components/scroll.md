# ScrollView

Scrollable viewport with optional fixed header/footer.

## Usage

```html
<vt-scroll [height]="10">
  <!-- long content here -->
</vt-scroll>
```

## Inputs

| Input | Type | Default | Description |
|---|---|---|---|
| `height` | `number` | `10` | Viewport height in rows |
| `offset` | `number` | `0` | Scroll offset (first visible row) |

## Description

`ScrollViewComponent` wraps child content in a fixed-height viewport. Only children within the `[offset, offset + height)` range are visible. Content outside the viewport is clipped.

## Examples

### Basic Scroll

```html
<vt-box flexDirection="column" [gap]="1">
  <vt-text fontWeight="bold">Scrollable List</vt-text>
  <vt-scroll [height]="8" [offset]="scrollOffset()">
    @for (item of items(); track item) {
      <vt-text>{{ item }}</vt-text>
    }
  </vt-scroll>
  <vt-text color="gray">Offset: {{ scrollOffset() }}</vt-text>
</vt-box>
```

### With Keyboard Navigation

```typescript
readonly scrollOffset = signal(0);
readonly items = signal(Array.from({ length: 50 }, (_, i) => `Item ${i + 1}`));

onKeyDown(event: KeyEvent) {
  if (event.name === 'down') {
    this.scrollOffset.update(o => Math.min(o + 1, this.items().length - 8));
  } else if (event.name === 'up') {
    this.scrollOffset.update(o => Math.max(0, o - 1));
  }
}
```
