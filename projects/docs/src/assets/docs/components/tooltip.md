# Tooltip & Overlay (CDK)

Terminal-flavored overlays: floating panels that paint above the application,
driven by the same renderer and layout engine.

## Features

- `vtTooltip` directive — hover a widget to show a hint box
- `OverlayService` — low-level API for custom popovers, dropdowns, drag ghosts
- `OverlayRef` — position, attach, and dispose an overlay panel
- Z-order guaranteed — overlays paint in creation order, later over earlier

## Setup

The overlay system is opt-in. Register it once at bootstrap:

```typescript
import { bootstrapTerminal, provideOverlay } from '@quenetiq/platform-vt';
import { App } from './app';

bootstrapTerminal(App, {
  providers: [provideOverlay()],
});
```

## Tooltip directive

```html
<vt-box vtTooltip="Shows extra info" vtTooltipPosition="top">
  Hover me
</vt-box>
```

### Inputs

| Input | Type | Default | Description |
|---|---|---|---|
| `vtTooltip` | `string` | required | Tooltip text |
| `vtTooltipPosition` | `'bottom' \| 'top' \| 'right' \| 'left'` | `'bottom'` | Side of the host the tooltip appears on |
| `vtTooltipOffset` | `number` | `1` | Gap between host and tooltip (rows/columns) |

Tooltips show while the mouse hovers the host and hide when it leaves.
Mouse reporting is enabled automatically on first use.

## Low-level overlays

For custom floating UI, inject `OverlayService` directly:

```typescript
import { inject, Component } from '@angular/core';
import { OverlayService } from '@quenetiq/platform-vt';
import { MyPopupComponent } from './my-popup';

@Component({
  selector: 'app-things',
  template: `
    <vt-button label="Open" (clicked)="open()"></vt-button>
  `,
})
export class Things {
  private readonly overlay = inject(OverlayService);

  open(): void {
    const ref = this.overlay.create();
    ref.attach(MyPopupComponent);
    ref.setPosition(10, 5);
    // ref.dispose() closes it; call it when the popup should disappear
  }
}
```

### OverlayRef API

| Method | Description |
|---|---|
| `attach(component, inputs?)` | Mount a component onto the overlay panel |
| `setPosition(x, y)` | Absolute column/row position |
| `setPositionFromRect(rect, side, offsetX?, offsetY?)` | Anchor to an existing element's bounding box |
| `dispose()` | Detach content and remove the panel |

## Notes

- Overlays are painted after the main tree, so they always sit on top.
- `setPositionFromRect` needs the host's layout rect — get it with
  `RenderService.getElementRect(element)`.
- Requires `InputService` and `RenderService`, which `bootstrapTerminal`
  provides automatically.