# Log Viewer

A virtualized, auto-following log viewer with severity and text filters.

## Usage

```html
<vt-log-viewer
  [lines]="logs()"
  [height]="12"
  [follow]="true"
  (scrollChange)="saveOffset($event)">
</vt-log-viewer>
```

## Inputs

| Input | Type | Default | Description |
|---|---|---|---|
| `lines` | `LogEntry[]` | `[]` | Entries, oldest first |
| `height` | `number` | `10` | Number of visible rows |
| `follow` | `boolean` | `true` | Allow pinning to the newest entry |
| `filter` | `string` | `''` | Case-insensitive text filter |
| `levels` | `LogLevel[]` | `[]` | Show only these levels (empty = all) |
| `showTimestamps` | `boolean` | `false` | Prefix lines with `entry.timestamp` |
| `emptyText` | `string` | `'No log entries'` | Placeholder for an empty log |

```typescript
interface LogEntry {
  text: string;
  level?: 'debug' | 'info' | 'success' | 'warn' | 'error';
  timestamp?: string;
}
```

## Outputs

| Output | Type | Description |
|---|---|---|
| `scrollChange` | `number` | Current offset after scrolling |

## Behavior

- Only `height` rows are rendered; the rest is virtualized.
- When pinned, new entries scroll into view automatically.
- Scrolling up unpins the view; scrolling back to the bottom re-pins it.
- Mouse wheel scrolling requires `provideWheelService()` (included in
  `bootstrapTerminal`).
- Severity colors: debug gray, success green, warn yellow, error red.

## Keyboard

| Key | Action |
|---|---|
| Up / Down | Scroll one row |
| PageUp / PageDown | Scroll one viewport |
| Home / End | Jump to the top/bottom |

## Example

```typescript
readonly logs = signal<LogEntry[]>([
  { text: 'Starting build', level: 'info', timestamp: '12:00:00' },
  { text: 'Cache miss', level: 'warn', timestamp: '12:00:01' },
  { text: 'Build failed', level: 'error', timestamp: '12:00:04' },
]);
```

```html
<vt-log-viewer [lines]="logs()" [height]="8" [showTimestamps]="true"
  [levels]="['info', 'warn', 'error']"></vt-log-viewer>
```
