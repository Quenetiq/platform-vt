# Testing

## Quick Start

Use the `renderComponent()` harness to mount a component as the terminal app
root and inspect the painted screen:

```typescript
import { renderComponent } from '@quenetiq/platform-vt/testing';
import { MyComponent } from './my.component';

it('renders text', async () => {
  const view = await renderComponent(MyComponent, { columns: 40, rows: 10 });

  expect(view.text()).toContain('Hello');

  view.dispose();
});
```

## renderComponent

```typescript
function renderComponent<C>(
  component: Type<C>,
  options?: {
    providers?: (Provider | EnvironmentProviders)[];
    columns?: number; // default 80
    rows?: number;    // default 24
  },
): Promise<{
  fixture: ComponentFixture<C>;
  render: RenderService;
  terminal: TerminalService;
  flush: () => void;
  text: () => string;
  dispose: () => void;
}>;
```

| Method | Description |
|---|---|
| `flush()` | Runs a synchronous render pass |
| `text()` | Painted frame text, trailing spaces trimmed per line |
| `dispose()` | Destroys the fixture and removes global DOM artifacts |

The harness marks the host element as `#vt-root`, installs the standard
services (`TerminalService`, `RenderService`, `InputService`, `FocusService`,
`MouseService`, `ClickService`) and uses zoneless change detection.

## Testing Components with Signals

```typescript
it('responds to signal changes', async () => {
  const view = await renderComponent(CounterComponent);
  const instance = view.fixture.componentInstance as CounterComponent;

  instance.count.set(5);
  view.fixture.detectChanges();
  view.flush();

  expect(view.text()).toContain('5');
});
```

## Testing Interactions

Use `InputService.simulateKey()` — no internal casts or synthetic escape
sequences are needed:

```typescript
import { FocusService, InputService } from '@quenetiq/platform-vt';

it('moves the selection with the arrow keys', async () => {
  const view = await renderComponent(ListComponent);
  const input = view.fixture.debugElement.injector.get(InputService);

  input.simulateKey({ name: 'down', ctrl: false, meta: false, shift: false, sequence: '' });
  view.fixture.detectChanges();

  expect(view.fixture.componentInstance.index()).toBe(1);
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
