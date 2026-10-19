# Command Palette

A fuzzy-searchable command list (`Ctrl+P` by default via
`CommandPaletteService`).

## Setup

```typescript
bootstrapTerminal(App, {
  providers: [provideOverlay(), provideCommandPalette()],
});
```

```typescript
const palette = inject(CommandPaletteService);
palette.register({
  title: 'Save file',
  keywords: 'write persist',
  hint: 'Ctrl+S',
  category: 'File',
  action: () => save(),
});
```

`Ctrl+P` opens the palette; commands are grouped by `category`, ranked with
the fuzzy matcher, and activated with Enter.

## Standalone

```html
<vt-palette
  [commands]="commands"
  placeholder="Search…"
  (selected)="run($event)"
  (cancelled)="close()">
</vt-palette>
```

## Command shape

```typescript
interface PaletteCommand {
  title: string;
  keywords?: string;
  hint?: string;
  category?: string;
  action: () => void;
}
```

## Keyboard

| Key | Action |
|---|---|
| Up / Down | Move the selection (headers are skipped) |
| Enter | Run the selected command |
| Esc | Cancel |
