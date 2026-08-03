# @quenetiq/platform-vt

A custom Angular Renderer2-based terminal UI library. Renders Angular components to the terminal using ANSI escape sequences with a built-in flexbox layout engine.

## Features

- **Angular-native**: Standard Angular components, signals, and change detection
- **Custom flexbox layout**: Row/column direction, justify/align, grow/shrink, gap, padding, margin
- **14 built-in components**: Box, Text, Input, Button, Select, Checkbox, List, Table, Progress, Spinner, Separator, Spacer, Newline, ScrollView
- **ANSI rendering**: Colors (named + 24-bit RGB), bold, italic, underline, borders
- **Focus management**: Tab/Shift+Tab keyboard navigation
- **Signal-based**: All state uses Angular signals (`signal()`, `computed()`, `effect()`)

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Angular Template                      │
│  <vt-box> <vt-text> <vt-input> ...                      │
└──────────────────────┬──────────────────────────────────┘
                       │ Renderer2 calls
                       ▼
┌─────────────────────────────────────────────────────────┐
│                  VTNode Tree                             │
│  createVTNode / appendVTChild / setStyle / ...          │
└──────────────────────┬──────────────────────────────────┘
                       │ FlexLayout.calculate()
                       ▼
┌─────────────────────────────────────────────────────────┐
│                LayoutNode Tree                           │
│  Positioned nodes with x, y, width, height              │
└──────────────────────┬──────────────────────────────────┘
                       │ TerminalOutput.render()
                       ▼
┌─────────────────────────────────────────────────────────┐
│              ANSI Escape Sequences → stdout              │
│  cursor.moveTo(), fg.red(), bg.blue(), borders, ...     │
└─────────────────────────────────────────────────────────┘
```

## Quick Start

```bash
npm install @quenetiq/platform-vt
```

```typescript
// main.ts
import { bootstrapTerminal } from '@quenetiq/platform-vt';
import { App } from './app/app';

bootstrapTerminal(App).catch(console.error);
```

```typescript
// app.component.ts
import { Component } from '@angular/core';
import { BoxComponent, TextComponent } from '@quenetiq/platform-vt';

@Component({
  selector: 'app-root',
  imports: [BoxComponent, TextComponent],
  template: `
    <vt-box flexDirection="column" [gap]="1" border="single">
      <vt-text color="cyan" fontWeight="bold">Hello, Terminal!</vt-text>
      <vt-text>This is rendered with Angular.</vt-text>
    </vt-box>
  `,
})
export class App {}
```

## Documentation

- **[Getting Started](docs/getting-started.md)** — Installation, bootstrap, first app
- **[Layout System](docs/layout-system.md)** — Flexbox model, style properties, examples
- **[Components](docs/components/box.md)** — Per-component reference
- **[Services](docs/services.md)** — Terminal, Input, Focus, Render services
- **[Testing](docs/testing.md)** — Headless testing patterns
- **[Contributing](docs/contributing.md)** — Development setup, architecture
- **[API Reference](docs/compodoc/index.html)** — Auto-generated from TSDoc

## License

ISC
