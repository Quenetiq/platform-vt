# Paginator

A page navigator: `◀ 1 2 3 … 12 ▶`.

## Usage

```html
<vt-paginator [page]="page()" [total]="pages()" (pageChange)="page.set($event)">
</vt-paginator>
```

## Inputs

| Input | Type | Default | Description |
|---|---|---|---|
| `page` | `number` | `1` | Current 1-based page |
| `total` | `number` | `1` | Total pages |
| `maxButtons` | `number` | `7` | Page buttons before collapsing with `…` |
| `autofocus` | `boolean` | `false` | Focus on mount |

## Outputs

| Output | Type | Description |
|---|---|---|
| `pageChange` | `number` | New page (1-based) |

## Keyboard

| Key | Action |
|---|---|
| Left / Right | Previous/next page |
| Home / End | First/last page |
| PageUp / PageDown | Jump by the visible button count |
