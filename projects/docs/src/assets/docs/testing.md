# Testing

## Quick Start

Use the headless `renderCli()` helper to test components without a real terminal:

```typescript
import { renderCli } from '@quenetiq/platform-vt/testing';
import { MyComponent } from './my.component';

describe('MyComponent', () => {
  it('renders text', async () => {
    const { componentRef, flush } = await renderCli(MyComponent);

    // Trigger change detection
    flush();

    // Inspect the VTNode tree
    const root = componentRef.instance['rootNode']; // VTNode
    expect(root.children.length).toBeGreaterThan(0);
  });
});
```

## renderCli

```typescript
function renderCli(componentType: Type<unknown>): Promise<{
  fixture: ComponentFixture<unknown>;
  componentRef: ComponentRef<unknown>;
  flush: () => void;
  destroy: () => void;
}>;
```

| Method | Description |
|---|---|
| `flush()` | Triggers Angular change detection + VTNode render |
| `destroy()` | Cleans up the component and rendering context |

## Testing Components with Signals

```typescript
it('responds to signal changes', async () => {
  const { componentRef, flush } = await renderCli(CounterComponent);

  // Access component instance and modify signals
  const instance = componentRef.instance as CounterComponent;
  instance.count.set(5);
  flush();

  // Verify output
  const textNodes = findVTNodesByType(root, 'text');
  expect(textNodes.some(n => n.textContent === '5')).toBe(true);
});
```

## Testing Interactions

```typescript
import { FocusService, InputService } from '@quenetiq/platform-vt';

it('focuses on Tab', async () => {
  const { fixture, flush } = await renderCli(MyFormComponent);

  const focusService = fixture.debugElement.injector.get(FocusService);
  const inputService = fixture.debugElement.injector.get(InputService);

  // Simulate Tab key
  inputService.keyEvents.emit({ name: 'tab', ctrl: false, meta: false, shift: false, sequence: '\t' });
  flush();

  expect(focusService.focusedId()).toBe('my-input');
});
```

## Testing Services Directly

```typescript
import { FocusService } from '@quenetiq/platform-vt';

describe('FocusService', () => {
  it('manages focus targets', () => {
    // Services can be instantiated directly in unit tests
    // using TestBed with proper providers
  });
});
```

## Vitest Configuration

Tests use Vitest with `@analogjs/vitest-angular`:

```typescript
// vitest.config.mts
import { defineConfig } from 'vitest/config';
import angular from '@analogjs/vitest-angular';

export default defineConfig({
  plugins: [angular()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['src/test-setup.ts'],
  },
});
```

## Writing Good Tests

- **Test the tree, not stdout**: Assert on VTNode structure, not ANSI output
- **Test service contracts**: FocusService.registerFocusTarget → focusedId
- **Test effects**: Modify a signal, call flush(), assert the side effect
- **Avoid mocking Renderer2**: The VTNode tree is the canonical state — test against it
