import { Component, inject, input, effect, ElementRef, signal } from '@angular/core';
import { cursor } from '../../output/ansi';
import { readFileBuffer } from '../../utils/node';
import { parsePpmP6, sixelWrite } from '../../output/sixel';
import { DEFAULT_MAX_PNG_PIXELS, decodePng } from '../../output/png';
import { RenderService } from '../../services/render.service';
import { InputService } from '../../services/input.service';
import { TerminalService } from '../../services/terminal.service';
import type { TerminalCapabilities } from '../../services/terminal.service';

/**
 * Image transfer protocol used by {@link ImageComponent}.
 */
export type ImageProtocol = 'auto' | 'iterm2' | 'kitty' | 'sixel';

/**
 * Pick the image protocol that the terminal is most likely to support.
 *
 * Heuristic based on detected capabilities (see {@link detectCapabilities}):
 * iTerm.app uses the OSC 1337 protocol, kitty/wezterm/ghostty support the
 * kitty graphics protocol, and foot/mlterm/xterm-style terminals support
 * sixel. Unknown terminals fall back to the iTerm2 protocol.
 */
export function autoImageProtocol(
  capabilities: TerminalCapabilities,
): Exclude<ImageProtocol, 'auto'> {
  const program = capabilities.termProgram.toLowerCase();
  const term = capabilities.term.toLowerCase();
  if (program === 'iterm.app') return 'iterm2';
  if (
    term === 'xterm-kitty' ||
    program === 'ghostty' ||
    program === 'wezterm' ||
    program === 'konsole'
  ) {
    return 'kitty';
  }
  if (
    program === 'foot' ||
    term.includes('foot') ||
    term.includes('mlterm') ||
    term.includes('contour') ||
    term.includes('xterm')
  ) {
    return 'sixel';
  }
  return 'iterm2';
}

/**
 * Renders an actual image in supporting terminals.
 *
 * The image bytes are written directly to the terminal outside the cell
 * grid, and the component reserves blank rows in the layout so later frames
 * don't overwrite it:
 *
 * - **iTerm2** (default): OSC 1337 inline images.
 * - **kitty**: the kitty graphics protocol (PNG only, transmitted with
 *   `f=24` and chunked; JPEG/GIF need the iTerm2 or sixel path).
 * - **sixel**: the DEC sixel protocol — the source file must be a PPM P6
 *   image (plain raster, no decoder dependency); colors are quantized to a
 *   64-register palette.
 *
 * `width`/`height` are given in cells and converted to pixels using the
 * standard 8×16 glyph metrics; pass `widthPx`/`heightPx` for exact sizes.
 *
 * @example
 * ```html
 * <vt-image src="./logo.png" [width]="20" [height]="5" protocol="kitty"></vt-image>
 * ```
 */
@Component({
  selector: 'vt-image',
  template: '',
})
export class ImageComponent {
  private readonly elementRef = inject(ElementRef);
  private readonly renderService = inject(RenderService);
  private readonly terminal = inject(TerminalService);

  /** Path to an image file (PNG/JPEG/GIF). */
  readonly src = input.required<string>();
  /** Width in terminal cells (≈ width * 8 px). */
  readonly width = input<number>(20);
  /** Height in terminal cells (≈ height * 16 px). */
  readonly height = input<number>(5);
  /** Exact pixel width (overrides `width`). */
  readonly widthPx = input<number | null>(null);
  /** Exact pixel height (overrides `height`). */
  readonly heightPx = input<number | null>(null);
  /** Transfer protocol. `'auto'` (default) picks from terminal capabilities. */
  readonly protocol = input<ImageProtocol>('auto');
  /** Maximum image file size in bytes (default 10 MB). */
  readonly maxBytes = input<number>(10 * 1024 * 1024);
  /** Maximum decoded pixel count for sixel PNG decoding. */
  readonly maxPixels = input<number>(DEFAULT_MAX_PNG_PIXELS);

  /** Whether the image was emitted to the terminal. */
  readonly emitted = signal(false);

  /** Kitty graphics support from the startup query, when known. */
  private readonly kittyGraphics = inject(InputService, { optional: true })?.kittyGraphics ?? null;

  constructor() {
    effect(() => {
      const el = this.elementRef.nativeElement as HTMLElement;
      const src = this.src();
      const cols = this.width();
      const rows = this.height();

      // Reserve the grid space so later frames don't overwrite the image.
      el.setAttribute('display', 'block');
      el.setAttribute('flex-shrink', '0');
      el.setAttribute('width', String(cols));
      el.setAttribute('height', String(rows));
      el.setAttribute('min-height', String(rows));

      try {
        this.emitImage(src, el);
        this.emitted.set(true);
      } catch {
        el.setAttribute('content', `[image: ${src}]`);
        el.textContent = `[image: ${src}]`;
      }
      this.renderService.scheduleRender();
    });
  }

  private emitImage(src: string, el: HTMLElement): void {
    const buffer = readFileBuffer(src, this.maxBytes());
    if (!buffer) throw new Error(`Cannot read image: ${src}`);
    const widthPx = this.widthPx() ?? this.width() * 8;
    const heightPx = this.heightPx() ?? this.height() * 16;

    const requested = this.protocol();
    let protocol =
      requested === 'auto' ? autoImageProtocol(this.terminal.capabilities()) : requested;

    // The startup graphics query (when it answered "not supported") beats
    // the term-name heuristic: kitty-proto images would silently not render.
    if (protocol === 'kitty' && this.kittyGraphics?.() === false) {
      protocol = 'sixel';
    }
    if (protocol === 'kitty') {
      this.emitKitty(buffer, el);
      return;
    }
    if (protocol === 'sixel') {
      this.emitSixel(buffer, el);
      return;
    }
    this.emitIterm2(buffer, widthPx, heightPx, el);
  }

  /**
   * Emit an iTerm2 inline image (OSC 1337), placed at the component's cell
   * position after the next render pass — the same cursor positioning as
   * the kitty/sixel paths, so the image lands in its reserved grid space.
   */
  private emitIterm2(buffer: Buffer, widthPx: number, heightPx: number, el: HTMLElement): void {
    const base64 = buffer.toString('base64');
    const inline = `\x1b]1337;File=inline=1;preserveAspectRatio=0;width=${widthPx}px;height=${heightPx}px:${base64}\x07`;
    const unregister = this.renderService.onFlush(() => {
      const rect = this.renderService.getElementRect(el);
      if (!rect) return;
      unregister();
      this.terminal.write(cursor.moveTo(rect.x, rect.y) + inline);
    });
  }

  /**
   * Emit via the kitty graphics protocol, placed at the component's cell
   * position after the next render pass (the cursor must be positioned
   * there; the diff renderer repaints cells on flush).
   */
  private emitKitty(buffer: Buffer, el: HTMLElement): void {
    // The kitty protocol only understands PNG or raw RGBA (`f=32`). Sending
    // raw JPEG/GIF bytes as f=32 would be rejected; require PNG.
    const png = decodePng(buffer, { maxPixels: this.maxPixels() });
    if (!png) {
      throw new Error('kitty image protocol requires a PNG file');
    }

    const payload = buffer.toString('base64');
    const chunkSize = 4096;
    const chunks: string[] = [];
    for (let i = 0; i < payload.length; i += chunkSize) {
      const chunk = payload.slice(i, i + chunkSize);
      const last = i + chunkSize >= payload.length;
      // Control keys are sent only in the first chunk; continuation chunks
      // carry `m` plus the payload.
      chunks.push(
        i === 0
          ? `\x1b_Ga=T,f=24,s=${String(png.width)},v=${String(png.height)},m=${last ? 0 : 1};${chunk}\x1b\\`
          : `\x1b_Gm=${last ? 0 : 1};${chunk}\x1b\\`,
      );
    }

    const unregister = this.renderService.onFlush(() => {
      const rect = this.renderService.getElementRect(el);
      if (!rect) return;
      unregister();
      this.terminal.write(cursor.moveTo(rect.x, rect.y) + chunks.join(''));
    });
  }

  /**
   * Emit an image via the sixel protocol, placed at the component's cell
   * position after the next render pass. PNG files are decoded in-process;
   * otherwise the file must be a PPM P6 raster.
   */
  private emitSixel(buffer: Buffer, el: HTMLElement): void {
    const png = decodePng(buffer, { maxPixels: this.maxPixels() });
    let width: number;
    let height: number;
    let rgb: Uint8Array;
    if (png) {
      width = png.width;
      height = png.height;
      rgb = png.rgb;
    } else {
      const ppm = parsePpmP6(buffer);
      width = ppm.width;
      height = ppm.height;
      rgb = ppm.rgb;
    }
    const sequence = sixelWrite(width, height, rgb);
    const unregister = this.renderService.onFlush(() => {
      const rect = this.renderService.getElementRect(el);
      if (!rect) return;
      unregister();
      this.terminal.write(cursor.moveTo(rect.x, rect.y) + sequence);
    });
  }
}
