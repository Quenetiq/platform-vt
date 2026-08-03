# Progress

Progress bar with percentage display.

## Usage

```html
<vt-progress [progress]="50" [width]="30"></vt-progress>
```

## Inputs

| Input | Type | Default | Description |
|---|---|---|---|
| `progress` | `number \| string` | `0` | Progress percentage (0–100) |
| `width` | `number \| string` | `20` | Bar width in characters |
| `showPercent` | `boolean \| string` | `true` | Show percentage text |

## Styling

- **Empty**: `░` characters
- **Filled**: `█` characters
- **Color**: Green below 50%, yellow 50–80%, red above 80%
- **Percent**: Shown as `( 50%)` after the bar

## Examples

### Basic

```html
<vt-progress [progress]="65" [width]="30"></vt-progress>
```

### Dynamic

```typescript
readonly progress = signal(0);

constructor() {
  setInterval(() => {
    this.progress.update(p => (p + 1) % 101);
  }, 100);
}
```

```html
<vt-progress [progress]="progress()" [width]="40"></vt-progress>
```

### Without Percent

```html
<vt-progress [progress]="75" [width]="20" [showPercent]="false"></vt-progress>
```
