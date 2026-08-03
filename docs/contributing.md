# Contributing

## Development Setup

```bash
# Clone
git clone git@github.com:quenetiq/platform-vt.git
cd platform-vt

# Install
npm install

# Build
ng build platform-vt

# Test
ng test platform-vt

# Lint
ng lint platform-vt

# Demo
ng serve demo
```

## Architecture

### VTNode Tree

The VTNode is the core data structure — a virtual DOM for the terminal:

```typescript
type VTNode =
  | { type: 'root'; children: VTNode[] }
  | { type: 'element'; tagName: string; attributes: Record<string, string>; children: VTNode[]; styles: Record<string, string> }
  | { type: 'text'; textContent: string };
```

Every `Renderer2.createElement()`, `appendChild()`, `insertBefore()`, `setStyle()`, `setProperty()`, `removeChild()` call mutates this tree.

### Custom Renderer2

`TerminalRenderer` translates Angular's rendering calls into VTNode mutations:

| Angular Call | VTNode Operation |
|---|---|
| `createElement('vt-box')` | `createVTNode('element', 'vt-box')` |
| `appendChild(parent, child)` | `appendVTChild(parent, child)` |
| `setStyle(el, 'color', 'red')` | `el.styles['color'] = 'red'` |
| `setProperty(el, 'textContent', 'Hi')` | `el.textContent = 'Hi'` |

### Render Pipeline

```
Angular changes → Renderer2 calls → VTNode mutations → queueMicrotask → FlexLayout.calculate() → TerminalOutput.render() → stdout
```

### Layout Engine

`FlexLayout` resolves the VTNode tree into positioned `LayoutNode[]` using flexbox rules:
- Resolves auto dimensions from children
- Distributes free space via `flex-grow`
- Handles `justify-content` and `align-items`
- Applies padding, margin, and gap

### Component Pattern

All components follow the same structure:

```typescript
@Component({
  selector: 'vt-foo',
  imports: [],
  template: '',
  styles: [],
})
export class FooComponent {
  readonly prop1 = input<string>('default');
  readonly prop2 = input<number>(0);
  readonly clicked = output<void>();

  private readonly renderer = inject(Renderer2);
  private readonly elementRef = inject(ElementRef);

  constructor() {
    effect(() => {
      // Sync input() values to VTNode styles
      const node = this.elementRef.nativeElement as VTNode;
      // ...
    });
  }
}
```

### Testing

- Tests use `vi.fn()` mocks with class-based mock services (no `as` casts)
- `MockRenderService` implements `RenderScheduler` interface
- Tests assert on VTNode structure, not ANSI output
- `renderCli()` helper provides headless test context

### Code Style

- ESLint strict+stylistic (flat config)
- No `any`, no `as` casts, explicit return types
- TSDoc on all public exports
- `signal()`, `computed()`, `effect()` — never mutable signals
- `inject()` — no constructor injection
- `takeUntilDestroyed()` — no manual DestroyRef
- `vt-` prefix for all components
