# Devtools

A built-in debug overlay with render statistics.

## Setup

```typescript
bootstrapTerminal(App, {
  providers: [provideOverlay(), provideDevtools()],
});
```

Requires the overlay providers (`provideOverlay()`); the standard bootstrap
providers cover input, focus and rendering.

## Toggle

| Shortcut | Action |
|---|---|
| `Ctrl+Shift+D` | Show/hide the panel |
| `F12` | Show/hide the panel |

## What it shows

- Terminal size in columns × rows
- Total render passes
- Duration of the last frame (ms)
- Number of dirty/changed cells in the last frame
- Layout tree node count and depth
- Focused element id
- Open overlay panel count
- Active responsive breakpoint

The panel is an overlay, so it does not affect the application layout. Use it
during development; `provideDevtools()` is opt-in and can be omitted from
production builds.
