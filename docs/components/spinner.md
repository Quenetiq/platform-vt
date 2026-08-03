# Spinner

Animated spinner with optional label.

## Usage

```html
<vt-spinner label="Loading..." [frame]="frame()"></vt-spinner>
```

## Inputs

| Input | Type | Default | Description |
|---|---|---|---|
| `label` | `string` | `'Loading...'` | Status text |
| `frame` | `number \| string` | `0` | Current animation frame |

## Spinner Frames

The spinner cycles through these characters: `⠋`, `⠙`, `⠹`, `⠸`, `⠼`, `⠴`, `⠦`, `⠧`, `⠇`, `⠏`

## Styling

- **Spinner character**: Cyan
- **Label**: Default color

## Examples

### Basic

```html
<vt-spinner label="Connecting..." [frame]="frame()"></vt-spinner>
```

### Animated

```typescript
readonly frame = signal(0);

constructor() {
  setInterval(() => {
    this.frame.update(f => (f + 1) % 10);
  }, 80);
}
```

```html
<vt-spinner [frame]="frame()" label="Working..."></vt-spinner>
```
