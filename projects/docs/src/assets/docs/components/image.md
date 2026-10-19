# Image

Inline images using the kitty, iTerm2 or sixel protocols.

## Usage

```html
<vt-image src="./logo.png" [width]="24" [height]="8"></vt-image>
```

`width`/`height` are in terminal cells and reserve the grid space so later
frames do not overwrite the image.

## Inputs

| Input | Type | Default | Description |
|---|---|---|---|
| `src` | `string` | — | Image path (required) |
| `width` / `height` | `number` | `20` / `5` | Size in cells (8×16 px per cell) |
| `widthPx` / `heightPx` | `number \| null` | `null` | Exact pixel size |
| `protocol` | `'auto' \| 'iterm2' \| 'kitty' \| 'sixel'` | `'auto'` | Transfer protocol |
| `maxBytes` | `number` | 10 MB | Refuse larger files before reading |
| `maxPixels` | `number` | 8M | PNG decode budget (sixel/kitty) |

## Protocols

- **iTerm2** — OSC 1337; supports PNG/JPEG/GIF (including animated GIFs).
- **kitty** — `f=24` PNG transfer; **PNG only** (non-PNG falls back to a text
  placeholder).
- **sixel** — PNG is decoded in-process; PPM P6 is accepted directly.

`protocol="auto"` picks from `TERM_PROGRAM`/`TERM`, and respects the kitty
graphics support query when available.

## Security

Files above `maxBytes` are rejected before reading. PNG decoding enforces the
pixel budget and a hard dimension cap, preventing decompression bombs.
Validate `src` if it comes from untrusted input.
