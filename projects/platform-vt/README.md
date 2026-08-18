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
- **Interactive components** — `vt-button`, `vt-input`, `vt-checkbox`, `vt-select`, `vt-list`
- **Display components** — `vt-box`, `vt-text`, `vt-table`, `vt-progress`, `vt-spinner`, `vt-scroll`, `vt-separator`, `vt-newline`, `vt-spacer`, `vt-caret`
- **Services** — terminal size, rendering, keyboard input, focus navigation, mouse/click handling
- **Theming** — a stylesheet parser + theme registry (`provideStyles`)
- **Overlay (CDK)** — floating panels rendered on top of the app, with hover tooltips

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
| NewlineComponent | `vt-newline` | Vertical spacing (`count`) |
| SpacerComponent | `vt-spacer` | Fills remaining flex space |
| SeparatorComponent | `vt-separator` | Horizontal line (`─`, `═`, …) |
| ScrollViewComponent | `vt-scroll` | Fixed-size scrollable viewport (chat-style bottom pinning) |

### Interactive

| Component | Selector | Inputs / Outputs |
|---|---|---|
| ButtonComponent | `vt-button` | `label`, `variant`, `autofocus` · `clicked` |
| InputComponent | `vt-input` | `placeholder`, `value`, `maxLength`, `mask`, `flexGrow` · `valueChange`, `submitted` |
| CheckboxComponent | `vt-checkbox` | `label`, `checked`, `autofocus` · `checkedChange` |
| SelectComponent | `vt-select` | `options`, `autofocus` · `valueChange` |
| ListComponent | `vt-list` | `items`, `autofocus` · `selectedChange`, `activated` |

### Display

| Component | Selector | Purpose |
|---|---|---|
| TableComponent | `vt-table` | Bordered table from `columns` / `rows` |
| ProgressComponent | `vt-progress` | Progress bar (`value`, `max`, `showPercent`) |
| SpinnerComponent | `vt-spinner` | Loading animation (`type`, `label`) |
| CaretComponent | `vt-caret` | Blinking cursor glyph |
| ClickableDirective | `[vt-clickable]` | Make any element mouse-clickable (`clicked`) |

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
| `TerminalService` | Terminal size as signals (`columns`, `rows`) |
| `RenderService` | Schedules and flushes renders; layout hit-testing |
| `InputService` | Parses raw stdin into key events (`keyEvents`) |
| `FocusService` | Tab / Shift+Tab focus navigation |
| `MouseService` | SGR mouse events (press, release, move, wheel) |
| `ClickService` | Click hit-testing and dispatch |

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
