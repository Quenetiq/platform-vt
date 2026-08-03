# Getting Started

## Installation

```bash
npm install @quenetiq/platform-vt
```

## Bootstrap

Replace `bootstrapApplication` with `bootstrapTerminal`:

```typescript
// src/main.ts
import { bootstrapTerminal } from '@quenetiq/platform-vt';
import { App } from './app/app';

bootstrapTerminal(App).catch(console.error);
```

`bootstrapTerminal` sets up:
- The VTNode tree (virtual terminal DOM)
- Custom Angular Renderer2
- Terminal services (dimensions, input, focus, rendering)
- Zoneless change detection

## Your First Component

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

## Project Structure

```
src/
  main.ts              ← bootstrapTerminal()
  app/
    app.ts             ← Root component (uses vt-* components)
```

## Adding Interactivity

```typescript
import { Component, signal } from '@angular/core';
import {
  BoxComponent, TextComponent, InputComponent, ButtonComponent
} from '@quenetiq/platform-vt';

@Component({
  selector: 'app-root',
  imports: [BoxComponent, TextComponent, InputComponent, ButtonComponent],
  template: `
    <vt-box flexDirection="column" [gap]="1" [padding]="1" border="single">
      <vt-text color="cyan" fontWeight="bold">Calculator</vt-text>

      <vt-box flexDirection="row" [gap]="1">
        <vt-input placeholder="Enter a number" (submitted)="onSubmit($event)"></vt-input>
        <vt-button label="Add" (clicked)="onAdd()"></vt-button>
      </vt-box>

      @if (result()) {
        <vt-text color="green">Result: {{ result() }}</vt-text>
      }
    </vt-box>
  `,
})
export class App {
  private readonly value = signal(0);
  protected readonly result = signal('');

  onSubmit(val: string) {
    this.value.set(Number(val) || 0);
  }

  onAdd() {
    this.result.set(String(this.value() + 1));
  }
}
```

## Running

```bash
ng build platform-vt
ng serve demo
```

## Next Steps

- [Layout System](layout-system.md) — Understand flexbox styling
- [Components](components/box.md) — Browse all components
- [Services](services.md) — Low-level terminal services
