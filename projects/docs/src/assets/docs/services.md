# Services

## TerminalService

Manages terminal dimensions and raw mode.

```typescript
const terminalService = inject(TerminalService);

// Reactive terminal size
const columns = terminalService.columns;  // signal<number>
const rows = terminalService.rows;        // signal<number>

// Resize handling
terminalService.resize(cols, rows);       // Manually trigger resize
terminalService.setupResizeListener();    // Listen to process.stdout 'resize' event

// Raw mode
terminalService.enterRawMode();           // Disables echo + line buffering
terminalService.exitRawMode();            // Restores previous terminal state
```

## RenderService

Schedules VTNode tree renders to stdout.

```typescript
const renderService = inject(RenderService);

// Queue a render (debounced — multiple calls batched into one)
renderService.queueRender();

// Force immediate render
renderService.flush();
```

Uses `queueMicrotask` internally to batch multiple Renderer2 mutations into a single render cycle. The render pipeline:

1. `FlexLayout.calculate(rootNode, columns, rows)` — produces positioned `LayoutNode[]`
2. `TerminalOutput.render(layoutNodes, stream)` — writes ANSI to `process.stdout`

## InputService

Parses raw keyboard input from `process.stdin`.

```typescript
const inputService = inject(InputService);

// Signal-based key events
const lastKey = inputService.lastKey;      // signal<KeyEvent | null>
const keyEvents = inputService.keyEvents;   // Subject<KeyEvent>

// Focus cycling
inputService.triggerFocusNext();            // Shift+Tab equivalent
inputService.triggerFocusPrevious();        // Tab equivalent
```

### KeyEvent shape

```typescript
interface KeyEvent {
  name: string;      // 'a', 'return', 'escape', 'up', 'f1', etc.
  ctrl: boolean;     // Ctrl held
  meta: boolean;     // Alt held
  shift: boolean;    // Shift held
  sequence: string;  // Raw input bytes
}
```

## FocusService

Manages focus across interactive components.

```typescript
const focusService = inject(FocusService);

// Register/unregister a focus target
focusService.registerFocusTarget(id, ref);
focusService.registerFocusTarget(id, elementRef);
focusService.unregisterFocusTarget(id);

// Query focus state
focusService.focusedId();           // signal<string | null>
focusService.isFocused(id);         // computed<boolean>

// Programmatic focus
focusService.focus(id);
focusService.clearFocus();

// Keyboard navigation (auto-bound to InputService)
focusService.focusNext();           // Move focus forward
focusService.focusPrevious();       // Move focus backward
```

### Focus flow

1. `InputService` detects Tab/Shift+Tab
2. `FocusService.focusNext()/focusPrevious()` computes next/previous ID from `focusTargets` map
3. `FocusService.focus(id)` sets `focusedId` signal
4. Component effects react to `isFocused(id)` and apply cursor styles

## Using Services in Components

```typescript
import { Component, inject, signal } from '@angular/core';
import { TerminalService, FocusService } from '@quenetiq/platform-vt';

@Component({ ... })
export class MyComponent {
  private readonly terminal = inject(TerminalService);
  private readonly focus = inject(FocusService);

  protected readonly status = computed(() => {
    const cols = this.terminal.columns();
    const focused = this.focus.focusedId();
    return `Terminal: ${cols} cols | Focus: ${focused ?? 'none'}`;
  });
}
```
