# Grid

A responsive grid container backed by `display: grid` in the layout engine.

## Usage

```html
<vt-grid [columns]="2" [gap]="1">
  <vt-box border="round" [padding]="1">Card 1</vt-box>
  <vt-box border="round" [padding]="1">Card 2</vt-box>
  <vt-box border="round" [padding]="1">Card 3</vt-box>
</vt-grid>
```

Children flow left to right and wrap to the next row. Each row is as tall as
its tallest cell.

## Inputs

| Input | Type | Default | Description |
|---|---|---|---|
| `columns` | `number \| string` | `2` | Equal column count, or explicit widths (`"10 20"` / `"1fr 1fr"`) |
| `gap` | `number` | `0` | Gap between columns and rows |
| `padding` | `number` | `0` | Inner padding |

## Responsive grids

Combine with `BreakpointService`:

```typescript
const bp = inject(BreakpointService);
const columns = computed(() => (bp.atLeast('lg') ? 4 : bp.atLeast('md') ? 3 : 2));
```

```html
<vt-grid [columns]="columns()" [gap]="1">
  @for (card of cards(); track card.id) {
    <vt-box border="round" [padding]="1">
      <vt-text [content]="card.title"></vt-text>
    </vt-box>
  }
</vt-grid>
```

## Notes

Explicit widths are scaled down proportionally when they exceed the available
width. Fraction tokens (`1fr`) and unknown tokens share the remaining space
equally.
