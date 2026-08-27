# @quenetiq/platform-vt

A terminal UI framework for Angular. Write Angular templates with signals,
standalone components and DI — the library renders them as interactive
terminal applications using ANSI escape sequences.

It runs the app in a DOM (jsdom), lays out the tree with a custom flexbox
engine, and paints it to the terminal. Everything is signal-based and
zoneless: `signal()`, `computed()`, `effect()`, `input()` / `output()`.

## Features

- **Angular 22** — standalone components, zoneless change detection, signal inputs/outputs
- **Flexbox layout engine** — `flexDirection`, `justifyContent`, `alignItems`, `gap`, `grow/shrink`, padding, margins, wrapping, scrolling, absolute positioning
- **Interactive components** — `vt-button`, `vt-input`, `vt-textarea`, `vt-autocomplete`, `vt-checkbox`, `vt-toggle`, `vt-select`, `vt-radio`, `vt-slider`, `vt-list`, `vt-tabs`, `vt-tree`, `vt-menu`, `vt-split-view`, `vt-paginator`
- **Display components** — `vt-box`, `vt-text`, `vt-link`, `vt-ansi-text`, `vt-table` (sortable, selectable, virtualized), `vt-progress`, `vt-spinner`, `vt-sparkline`, `vt-scroll`, `vt-separator`, `vt-newline`, `vt-spacer`, `vt-caret`, `vt-image`, `vt-badge`, `vt-statusbar`
- **Forms** — `vt-form` / `vt-form-field` with validators (`required`, `email`, `minLength`, …)
- **Services** — terminal size + capabilities, rendering, keyboard input, bracketed paste, focus navigation, mouse/click/wheel handling, global keybindings, clipboard (OSC 52), drag & drop, text selection, session recording, state persistence
- **Diff rendering** — cell-buffer virtual screen: only changed cells are repainted (unchanged frames cost ~0.4ms even at 1000 rows)
- **Overlays & dialogs** — floating panels (`OverlayService`), modal dialogs with focus traps (`DialogService.confirm`/`prompt`/`openTemplate`), context menus (`MenuService`), command palette (Ctrl+P), hover tooltips, toasts (`ToastService`)
- **Error handling** — framed error screen via `provideTerminalErrorHandler()`
- **Terminal modes** — alt screen buffer, raw mode, bracketed paste, graceful restore on SIGINT/SIGTERM/exit
- **Color adaptation** — truecolor / 256 / 16 detection and automatic fallback
- **Unicode-aware rendering** — CJK/emoji/combining marks measured in terminal cells
- **Theming** — a stylesheet parser + theme registry (`provideStyles`)

## Installation

```bash
npm install @quenetiq/platform-vt
```

Peer dependencies: `@angular/core` ≥ 22, `@angular/common` ≥ 22, `@angular/platform-server`, `rxjs`.

## Quick start

```typescript
// app.ts
import { Component } from '@angular/core';
import { BoxComponent, TextComponent, ButtonComponent } from '@quenetiq/platform-vt';

@Component({
  selector: 'app-root',
  imports: [BoxComponent, TextComponent, ButtonComponent],
  template: `
    <vt-box flexDirection="column" [gap]="1" [padding]="1" border="single">
      <vt-text color="cyan" fontWeight="bold">Hello terminal!</vt-text>
      <vt-button label="Click me" (clicked)="onClick()"></vt-button>
      <vt-text color="green" [content]="message()"></vt-text>
    </vt-box>
  `,
})
export class App {
  message = 'Press the button';

  onClick(): void {
    this.message = 'Button clicked!';
  }
}
```

```typescript
// main.ts
import { bootstrapTerminal } from '@quenetiq/platform-vt';
import { App } from './app';

bootstrapTerminal(App, {
  terminalBackground: 'black',
  terminalForeground: 'bright-white',
});
```

Run it:

```bash
npx tsx main.ts
```

## Components

### Layout

| Component | Selector | Purpose |
|---|---|---|
| BoxComponent | `vt-box` | Flex container (direction, justify, align, gap, padding, border, colors) |
| TextComponent | `vt-text` | Inline/block text (`content` input, color, weight, wrap) |
| LinkComponent | `vt-link` | OSC 8 hyperlink (`href`, `content`) |
| AnsiTextComponent | `vt-ansi-text` | Text with embedded ANSI colors rendered as-is (`content`) |
| NewlineComponent | `vt-newline` | Vertical spacing (`count`) |
| SpacerComponent | `vt-spacer` | Fills remaining flex space |
| SeparatorComponent | `vt-separator` | Horizontal line (`─`, `═`, …) |
| ScrollViewComponent | `vt-scroll` | Fixed-size scrollable viewport (chat-style bottom pinning, wheel scroll) |

### Interactive

| Component | Selector | Inputs / Outputs |
|---|---|---|
| ButtonComponent | `vt-button` | `label`, `variant`, `autofocus` · `clicked` |
| InputComponent | `vt-input` | `placeholder`, `value`, `maxLength`, `mask`, `flexGrow` · `valueChange`, `submitted` |
| TextAreaComponent | `vt-textarea` | `value`, `rows`, `placeholder`, `maxLength` · `valueChange`, `submitted` (Ctrl+Enter) |
| CheckboxComponent | `vt-checkbox` | `label`, `checked`, `autofocus` · `checkedChange` |
| ToggleComponent | `vt-toggle` | `label`, `checked` · `checkedChange` |
| SelectComponent | `vt-select` | `options`, `autofocus` · `valueChange` |
| RadioComponent / RadioGroupComponent | `vt-radio` / `vt-radio-group` | `value`, `label`, `checked` · `checkedChange` / `valueChange` |
| SliderComponent | `vt-slider` | `value`, `min`, `max`, `step`, `width` · `valueChange` |
| ListComponent | `vt-list` | `items`, `autofocus` · `selectedChange`, `activated` |
| TabsComponent | `vt-tabs` | `tabs`, `active` · `activeChange` |
| TreeComponent | `vt-tree` | `nodes` · `selected` |
| MenuComponent | `vt-menu` | `items` · `selected`, `cancelled` |

### Display

| Component | Selector | Purpose |
|---|---|---|
| TableComponent | `vt-table` | Bordered table from `columns` / `rows` |
| ProgressComponent | `vt-progress` | Progress bar (`value`, `max`, `showPercent`) |
| SpinnerComponent | `vt-spinner` | Loading animation (`type`, `label`) |
| SparklineComponent | `vt-sparkline` | Bar/braille chart from `data` |
| CaretComponent | `vt-caret` | Blinking cursor glyph |
| ClickableDirective | `[vt-clickable]` | Make any element mouse-clickable (`clicked`) |

### Forms

```html
<vt-form #f="vtForm" (submitted)="save(f.values())">
  <vt-form-field name="email" label="Email" [validators]="[required(), email()]">
    <vt-input placeholder="you@example.com" (valueChange)="email.set($event)"></vt-input>
  </vt-form-field>
  <vt-button label="Submit" (clicked)="f.submit()"></vt-button>
</vt-form>
```

Validators: `required()`, `minLength(n)`, `maxLength(n)`, `pattern(re)`, `email()`,
`min(n)`, `max(n)`, `equals(v)`, `compose(...)`. Invalid fields show a red
accent border and are excluded from `f.values()`/`submitted`.

## Overlay & tooltips (CDK)

Overlays render floating panels on top of the app. The terminal has no real
z-index — later layers simply paint over earlier ones, and overlays live in
their own layer above the application.

Register the overlay providers in `bootstrapTerminal`:

```typescript
import { bootstrapTerminal, provideOverlay } from '@quenetiq/platform-vt';

bootstrapTerminal(App, {
  providers: [provideOverlay()],
});
```

### Tooltips

```html
<vt-box vtTooltip="Extra info" [position]="'top'" [offset]="1">
  Hover me
</vt-box>
```

The tooltip appears while the mouse cursor is over the element and hides when
it leaves.

### Low-level overlay API

```typescript
import { inject } from '@angular/core';
import { OverlayService } from '@quenetiq/platform-vt';

export class MyComponent {
  private readonly overlay = inject(OverlayService);

  showHint() {
    const ref = this.overlay.create();
    ref.attach(MyHintComponent, { text: 'hello' }); // inputs set at creation
    ref.setPositionFromRect(anchorRect, 'bottom', 0, 1);
    // ...
    ref.dispose();
  }
}
```

`OverlayRef` API: `attach(component, inputs?)`, `setPosition(x, y)`,
`setPositionFromRect(rect, placement, offsetX, offsetY)`, `detach()`,
`dispose()`, `hasAttached()`.

Anchor rectangles come from `RenderService.getElementRect(element)`; the
element currently under the cursor is `RenderService.getElementAtPoint(x, y)`.

## Styling

Inline attributes on components (`color`, `backgroundColor`, `border`,
`flexDirection`, …) drive the renderer. Global styles can be provided with
`provideStyles`:

```typescript
import { bootstrapTerminal, provideStyles } from '@quenetiq/platform-vt';

bootstrapTerminal(App, {
  providers: [provideStyles({ stylesUrl: './styles.vt' })],
});
```

## Services

| Service | Purpose |
|---|---|
| `TerminalService` | Terminal size + capabilities as signals; alt screen, raw mode, cleanup |
| `RenderService` | Schedules and flushes renders; layout hit-testing; cell-buffer diff |
| `InputService` | Parses raw stdin into key events (`keyEvents`), bracketed paste (`pastes`) |
| `FocusService` | Tab / Shift+Tab focus navigation |
| `MouseService` | SGR mouse events (press, release, move, wheel) |
| `ClickService` | Click hit-testing and dispatch |
| `WheelService` | Wheel event hit-testing and dispatch (scroll views) |
| `KeymapService` | Global keybindings: `bind('ctrl-p', handler)` |
| `ClipboardService` | OSC 52 clipboard read/write |
| `SelectionService` | Shift+drag text selection, copy on release/Ctrl+C |
| `DragService` | Drag & drop dispatch (`[vtDraggable]`, `[vtDropZone]`) |
| `SessionRecorder` | Records stdout; exports asciinema v2 / ANSI screenshot |
| `PersistenceService` | JSON-backed persisted signals |
| `CommandPaletteService` | Ctrl+P fuzzy command palette |

## Selection, drag & drop, recording

```typescript
import { inject } from '@angular/core';
import { SelectionService, DragService, SessionRecorder } from '@quenetiq/platform-vt';

export class MyComponent {
  private readonly selection = inject(SelectionService);
  private readonly drag = inject(DragService);
  private readonly recorder = inject(SessionRecorder);

  startRecording() {
    this.recorder.start();
  }
  stopRecording() {
    this.recorder.stop();
    this.recorder.exportAsciinema('session.cast');
  }
}
```

Shift+drag selects text (reverse video) and copies it to the system
clipboard via OSC 52. Draggables/drop zones are declared with directives:

```html
<vt-box [vtDraggable]="true" (dragEnd)="onCardDrop($event)">Card</vt-box>
<vt-box [vtDropZone]="true" (dropped)="onDropHere($event)">Slot A</vt-box>
```

## Dialogs, menus & toasts

```typescript
import { inject } from '@angular/core';
import { DialogService, MenuService, ToastService } from '@quenetiq/platform-vt';

export class MyComponent {
  private readonly dialogs = inject(DialogService);
  private readonly menus = inject(MenuService);
  private readonly toasts = inject(ToastService);

  confirmDelete() {
    const ref = this.dialogs.open(ConfirmDialog, { title: 'Delete?' });
    ref.closed.subscribe(() => this.toasts.show('Deleted', { variant: 'success' }));
  }

  onRightClick(x: number, y: number) {
    this.menus.open(
      [{ label: 'Copy', hint: 'Ctrl+C' }, { label: 'Delete', disabled: true }],
      x,
      y,
    ).select.subscribe((index) => console.log('chose', index));
  }
}
```

Requires `provideOverlay()` (for dialogs/menus) and `provideToasts()` in
`bootstrapTerminal`.

## Development

```bash
npm install
npm run build       # build the library
npm test            # unit tests (vitest)
npm run lint        # eslint
npm run start       # run the demo in the terminal
```

## License

MIT
