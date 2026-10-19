# @quenetiq/platform-vt

A custom Angular `Renderer2` library that renders Angular components to the **terminal**. Write standard Angular templates with signals and standalone components — the library renders them as interactive terminal UIs using ANSI escape sequences and a built-in flexbox layout engine.

## Features

- **Angular-native** — standard components, `signal()`/`computed()`/`effect()`, zoneless change detection (`provideZonelessChangeDetection`), no RxJS state.
- **Custom flexbox + grid layout engine** — row/column direction, `justifyContent` / `alignItems`, `flexGrow` / `flexShrink`, gap, padding, margin, borders, and `display: grid`.
- **40+ built-in components** — forms (`input`, `textarea`, `select`, `slider`, `toggle`, `radio`), data views (`table`, `tree`, `list`, `chart`, `sparkline`, `diff`, `markdown`), layout (`box`, `grid`, `split-view`, `scroll`, `window`), feedback (`toast`, `dialog`, `progress`, `skeleton`, `spinner`) and more.
- **Full ANSI rendering** — named + 24-bit RGB colors, bold, italic, underline, strikethrough, rounded and double borders, sixel/kitty/iTerm2 images.
- **Interaction** — keyboard input, kitty keyboard protocol, focus traps, mouse click/wheel/drag/hover, multi-region selection, copy/paste.
- **Terminal integration** — window title, desktop notifications, taskbar progress, cursor shape, shell integration (OSC 133), auto light/dark theme detection.
- **Responsive** — terminal-size breakpoints and the `vt-grid` container.
- **Theming** — a lightweight `.vt` stylesheet DSL with `StyleRegistry` and CSS-like selectors.
- **Tooling** — devtools overlay (`Ctrl+Shift+D`), session recorder, snapshots, benchmarks and a `renderComponent` test harness.

## Installation

```bash
npm install @quenetiq/platform-vt
```

Peer dependencies: `@angular/common`, `@angular/core`, `@angular/platform-server` (all `^22.0.0`), `rxjs` `^7.8.0`.

## Quick Start

Replace `bootstrapApplication` with `bootstrapTerminal`:

```typescript
// src/main.ts
import { bootstrapTerminal } from '@quenetiq/platform-vt';
import { App } from './app/app';

bootstrapTerminal(App).catch(console.error);
```

```typescript
// src/app/app.ts
import { Component } from '@angular/core';
import { BoxComponent, TextComponent, SeparatorComponent } from '@quenetiq/platform-vt';

@Component({
  selector: 'app-root',
  imports: [BoxComponent, TextComponent, SeparatorComponent],
  template: `
    <vt-box flexDirection="column" [gap]="1" [padding]="1" border="single">
      <vt-text color="cyan" fontWeight="bold">My Terminal App</vt-text>
      <vt-separator></vt-separator>
      <vt-text>Hello, World!</vt-text>
    </vt-box>
  `,
})
export class App {}
```

Run it from a terminal (not a browser):

```bash
npm start
```

## Components

| Component | Selector | Purpose |
|---|---|---|
| Box | `<vt-box>` | Flexbox container |
| Grid | `<vt-grid>` | Responsive equal-width grid |
| Window | `<vt-window>` | Draggable/resizable floating window |
| Split view | `<vt-split-view>` | Two panes with a draggable divider |
| Text | `<vt-text>` | Wrapped/aligned text with styles |
| Input | `<vt-input>` | Text input with completion, reveal and undo |
| Textarea | `<vt-textarea>` | Multiline input with vim mode and multi-cursor |
| Button | `<vt-button>` | Clickable action |
| Select | `<vt-select>` | Single/multi select with filtering and type-ahead |
| Checkbox / Toggle / Radio | `<vt-checkbox>` / `<vt-toggle>` / `<vt-radio>` | Boolean controls |
| Slider | `<vt-slider>` | Numeric setting |
| List | `<vt-list>` | Item list |
| Table | `<vt-table>` | Filtering, multi-select, sortable/resizable/reorderable columns |
| Tree | `<vt-tree>` | Expand/collapse, checkboxes, lazy children, filtering |
| Tabs | `<vt-tabs>` | Multi-view apps |
| Menu / Palette | `<vt-menu>` / `<vt-palette>` | Context menus and command palette |
| Dialog | `DialogService` | Modal dialogs, confirm/prompt promises |
| Markdown / Diff / Chart | `<vt-markdown>` / `<vt-diff>` / `<vt-chart>` | Rich rendering |
| Log viewer | `<vt-log-viewer>` | Virtualized logs with levels, filter and auto-follow |
| Gauge / Heatmap | `<vt-gauge>` / `<vt-heatmap>` | Dashboard meters and matrices |
| Breadcrumb | `<vt-breadcrumb>` | Clickable navigation trail |
| Image | `<vt-image>` | Sixel, kitty and iTerm2 inline images |
| Progress / Spinner / Skeleton | `<vt-progress>` / `<vt-spinner>` / `<vt-skeleton>` | Async feedback |
| ScrollView | `<vt-scroll>` | Scrollable viewport (chat-style, pins to bottom) |
| Badge / Status bar / Paginator | `<vt-badge>` / `<vt-statusbar>` / `<vt-paginator>` | App chrome |
| Separator / Spacer / Newline / Caret | `<vt-separator>` / `<vt-spacer>` / `<vt-newline>` / `<vt-caret>` | Layout primitives |
| Clickable / Draggable / Drop zone | `vtClickable` / `vtDraggable` / `vtDropZone` | Interaction directives |

## Layout & Styling

The layout engine is a flexbox clone. Control it with host directives:

```html
<vt-box
  flexDirection="row"
  [flexGrow]="1"
  [gap]="1"
  [padding]="'1 2'"
  [justifyContent]="'space-between'"
  [alignItems]="'center'"
  border="round"
>
```

Global styling uses a stylesheet DSL with CSS-like selectors:

```css
/* styles.vt */
vt-box {
  background-color: #0d1117;
}

.user {
  padding: 1 3;
  border-left: thick;
  color: #58a6ff;
}
```

```typescript
bootstrapTerminal(App, {
  providers: [provideStyles({ stylesUrl: './src/styles.vt' })],
});
```

## Interactivity

```html
<vt-box flexDirection="row" [gap]="1">
  <vt-input placeholder="Type a message" (submitted)="onSend($event)"></vt-input>
  <vt-button label="Send" (clicked)="onSend()"></vt-button>
</vt-box>
```

Focus navigation uses Tab / Shift+Tab. Mouse events are reported via SGR mouse protocol and routed to clickable elements.

## Terminal Integration

```typescript
const terminal = inject(TerminalService);
terminal.setTitle('My app');
terminal.notify('Build finished', 'CI');   // OSC 9 desktop notification
terminal.setProgress('normal', 42);        // OSC 9;4 taskbar progress
terminal.setCursorStyle('bar');            // DECSCUSR

const theme = inject(ThemeService);        // provided by bootstrapTerminal
await theme.query();                       // OSC 10/11 -> light/dark + palette
theme.toggle();
theme.colors().accent;
```

`bootstrapTerminal` accepts `terminalTitle` and `autoTheme` options and restores
the title, cursor shape and progress indicator on exit.

## Responsive Layout

```html
<vt-grid [columns]="bp.atLeast('lg') ? 4 : 2" [gap]="1">
  <vt-box>Card 1</vt-box>
  <vt-box>Card 2</vt-box>
</vt-grid>
```

```typescript
const bp = inject(BreakpointService);   // provideBreakpoints({ md: 80, lg: 120 })
bp.breakpoint();                        // 'xs' | 'sm' | 'md' | 'lg' | 'xl'
bp.atLeast('md');
```

## Devtools

```typescript
bootstrapTerminal(App, {
  providers: [provideOverlay(), provideDevtools()],
});
```

Press `Ctrl+Shift+D` (or `F12`) to show render statistics, the layout tree
size, the focused element and the active breakpoint.

## Testing

```typescript
import { renderComponent } from '@quenetiq/platform-vt/testing';

const view = await renderComponent(App, { columns: 40, rows: 10 });
expect(view.text()).toContain('Hello');
view.dispose();
```

The harness wires the standard services, mounts the component as `#vt-root`,
flushes one render pass and exposes the painted text.

## Running the Demo

The demo (`Terminal Assistant`) shows the library in action — a chat UI with scrollable messages, input, spinner and status bars:

```bash
ng build platform-vt
npx ng build demo --configuration=development
node ./run-terminal.mjs
```

`run-terminal.mjs` runs the built bundle with jsdom globals while wiring stdin/stdout to your terminal. Press `Ctrl+C` to exit.

## Development

```bash
npm ci

# Library tests (Vitest)
npx ng test platform-vt --no-watch

# Lint
npx ng lint platform-vt

# Build the library into dist/platform-vt
ng build platform-vt

# Build the demo bundle
npx ng build demo --configuration=development

# Generate API docs (compodoc)
npx compodoc -c .compodocrc.yaml
```

## CI / Releases

- **CI** — lint, build and tests run on every push to `main` and on pull requests.
- **Docs** — the compodoc site is deployed to GitHub Pages on pushes to `main`.
- **Release** — push a tag matching `v*` (e.g. `git tag v0.0.1 && git push origin v0.0.1`). The release workflow runs tests, builds the library, syncs the version from the tag, publishes `@quenetiq/platform-vt` to npm and creates a GitHub Release. Requires an `NPM_TOKEN` secret in the repository settings.

## Documentation

See the `docs/` directory:

- [Getting Started](docs/getting-started.md)
- [Layout System](docs/layout-system.md)
- [Services](docs/services.md)
- [Components](docs/components)
- [Testing](docs/testing.md)
- [Contributing](docs/contributing.md)
