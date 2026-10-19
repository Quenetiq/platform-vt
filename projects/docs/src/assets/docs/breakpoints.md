# Responsive Breakpoints

`BreakpointService` derives `xs` / `sm` / `md` / `lg` / `xl` from the terminal
width and updates automatically on resize.

## Setup

```typescript
bootstrapTerminal(App, {
  providers: [provideBreakpoints({ sm: 40, md: 80, lg: 120, xl: 160 })],
});
```

## Usage

```typescript
const bp = inject(BreakpointService);

bp.width();        // signal<number>
bp.breakpoint();   // signal<'xs' | 'sm' | 'md' | 'lg' | 'xl'>
bp.atLeast('md');  // boolean
bp.matches('sm', 'md');
bp.isMd();         // convenience computed
```

```html
<vt-grid [columns]="bp.atLeast('lg') ? 4 : bp.atLeast('sm') ? 2 : 1" [gap]="1">
  ...
</vt-grid>
```

## Default thresholds

| Breakpoint | Minimum columns |
|---|---|
| `xs` | 0 |
| `sm` | 40 |
| `md` | 80 |
| `lg` | 120 |
| `xl` | 160 |
