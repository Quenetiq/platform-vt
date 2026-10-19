# Theme & Terminal Integration

`ThemeService` detects the terminal's light/dark scheme and exposes a semantic
palette. `TerminalService` covers the common terminal OS integrations.

## Color scheme detection

The scheme is initialized from `TERM_BACKGROUND` / `COLORFGBG`, then refined by
asking the terminal for its default colors (OSC 10/11):

```typescript
const theme = inject(ThemeService);

await theme.query();          // resolves with foreground/background
theme.scheme();               // 'dark' | 'light'
theme.colors();               // { background, foreground, muted, accent, border, success, warning, error, info }
theme.toggle();               // flip dark <-> light
```

`bootstrapTerminal` provides `ThemeService` and queries it automatically on a
real TTY (`autoTheme: false` disables this).

## No-color mode

Color output follows the standard environment variables:

| Variable | Effect |
|---|---|
| `NO_COLOR` (set) | Disable all color codes (bold/underline still apply) |
| `FORCE_COLOR=0` | Disable colors |
| `FORCE_COLOR=1` | Force 16 colors |
| `FORCE_COLOR=2` | Force 256 colors |
| `FORCE_COLOR=3` | Force truecolor |

`terminal.capabilities().colors` is `'none'` in monochrome mode.

## Title, notifications and progress

```typescript
const terminal = inject(TerminalService);

terminal.pushTitle();
terminal.setTitle('Deploying…');
terminal.restoreTitle();             // on exit

terminal.notify('Build finished', 'CI');
terminal.setProgress('normal', 42);
terminal.setProgress('error', 100);
terminal.clearProgress();

terminal.bell();
terminal.flash(120);
terminal.setCursorStyle('bar', false);
```

- Title uses OSC 2 and a CSI 22/23 stack.
- Notifications use OSC 9 (iTerm2, WezTerm, Windows Terminal, …).
- Progress uses OSC 9;4 (`normal`, `error`, `warning`, `indeterminate`,
  `remove`).
- Cursor shape uses DECSCUSR.

`TerminalService.cleanup()` restores the title, cursor shape and progress
indicator.

## Bootstrap options

```typescript
bootstrapTerminal(App, {
  terminalTitle: 'My app',
  autoTheme: true,
  terminalBackground: 'black',
  terminalForeground: 'white',
});
```
