# Toast

Transient notifications in the top-right corner.

## Setup

```typescript
bootstrapTerminal(App, { providers: [provideToasts()] });
```

```typescript
const toasts = inject(ToastService);
toasts.show('Saved', { variant: 'success' });
toasts.show('Connection lost', { variant: 'error', duration: 0 });
```

## Options

```typescript
interface ToastOptions {
  variant?: 'info' | 'success' | 'error' | 'warning';
  title?: string;
  duration?: number; // ms; 0 keeps the toast until dismissed
}
```

| Method | Description |
|---|---|
| `show(message, options?)` | Add a toast; returns its id |
| `dismiss(id)` | Dismiss one toast |
| `dismissAll()` | Dismiss all toasts |

`toasts()` exposes the current list. Toasts render in their own layer above
the application, newest on top.
