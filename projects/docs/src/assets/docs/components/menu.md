# Menu

A keyboard-navigable menu with nested submenus, usable standalone or as a
context menu through `MenuService`.

## Context menu

```typescript
const menus = inject(MenuService);
menus
  .open(
    [
      { label: 'Copy', hint: 'Ctrl+C' },
      {
        label: 'Edit',
        children: [{ label: 'Undo' }, { label: 'Redo' }],
      },
    ],
    event.x,
    event.y,
  )
  .select.subscribe((path) => console.log('chosen', path));
```

`open()` returns `{ select, cancel, close }`. `select` emits the index path
from the root (`[1, 0]` = first item of the second item's submenu).

`MenuService` requires `provideOverlay()`.

## Standalone

```html
<vt-menu [items]="items" (selected)="choose($event)" (cancelled)="close()"></vt-menu>
```

## Item shape

```typescript
interface MenuItem {
  label: string;
  hint?: string;
  disabled?: boolean;
  children?: MenuItem[];
}
```

## Keyboard

| Key | Action |
|---|---|
| Up / Down | Move the highlight |
| Right / Enter / Space | Open a submenu / activate |
| Left / Esc | Back to the parent level / cancel at root |
| j / k | Move (with `[vim]="true"`) |

Disabled items are dimmed and skipped.
