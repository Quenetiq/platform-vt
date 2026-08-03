# @quenetiq/platform-vt

A custom Angular `Renderer2` library that renders Angular components to the **terminal**. Write standard Angular templates with signals and standalone components — the library renders them as interactive terminal UIs using ANSI escape sequences and a built-in flexbox layout engine.

## Features

- **Angular-native** — standard components, `signal()`/`computed()`/`effect()`, zoneless change detection (`provideZonelessChangeDetection`), no RxJS state.
- **Custom flexbox layout engine** — row/column direction, `justifyContent` / `alignItems`, `flexGrow` / `flexShrink`, gap, padding, margin, borders.
- **16 built-in components** — Box, Text, Input, Button, Select, Checkbox, List, Table, Progress, Spinner, Separator, Spacer, Newline, ScrollView, Caret, plus a Clickable directive.
- **Full ANSI rendering** — named + 24-bit RGB colors, bold, italic, underline, strikethrough, rounded and double borders.
- **Interaction** — keyboard input, Tab/Shift+Tab focus navigation, mouse click handling (SGR), blinking caret.
- **Theming** — a lightweight `.vt` stylesheet DSL with `StyleRegistry` and CSS-like selectors.

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
| Text | `<vt-text>` | Wrapped/aligned text with styles |
| Input | `<vt-input>` | Text input with `(submitted)` output |
| Button | `<vt-button>` | Clickable action |
| Select | `<vt-select>` | Dropdown / options picker |
| Checkbox | `<vt-checkbox>` | Toggle |
| List | `<vt-list>` | Item list |
| Table | `<vt-table>` | Tabular data |
| Progress | `<vt-progress>` | Progress bar |
| Spinner | `<vt-spinner>` | Async indicator (dots, bar, etc.) |
| ScrollView | `<vt-scroll>` | Scrollable viewport (chat-style, pins to bottom) |
| Separator | `<vt-separator>` | Horizontal rule |
| Spacer | `<vt-spacer>` | Flexible gap in a row/column |
| Newline | `<vt-newline>` | Line break |
| Caret | `<vt-caret>` | Blinking cursor glyph |
| Clickable | `vtClickable` | Makes any element clickable |

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
