import { Component, inject, input, effect, ElementRef, signal } from '@angular/core';
import * as fs from 'node:fs';
import { cursor } from '../../output/ansi';
import { RenderService } from '../../services/render.service';
import { TerminalService } from '../../services/terminal.service';

/**
 * Image transfer protocol used by {@link ImageComponent}.
 */
export type ImageProtocol = 'iterm2' | 'kitty';

/**
 * Renders an actual image in supporting terminals.
 *
 * The image bytes are written directly to the terminal outside the cell
 * grid, and the component reserves blank rows in the layout so later frames
 * don't overwrite it:
 *
 * - **iTerm2** (default): OSC 1337 inline images.
 * - **kitty**: the kitty graphics protocol (transmit + place at the cell
 *   position, chunks of 4096 bytes).
 *
 * `width`/`height` are given in cells and converted to pixels using the
 * standard 8×16 glyph metrics; pass `widthPx`/`heightPx` for exact sizes.
 * Sixel is not bundled.
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
  /** Transfer protocol. Defaults to `'iterm2'`. */
  readonly protocol = input<ImageProtocol>('iterm2');

  /** Whether the image was emitted to the terminal. */
  readonly emitted = signal(false);

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
    if (typeof process === 'undefined') return;
    const buffer = fs.readFileSync(src);
    const widthPx = this.widthPx() ?? this.width() * 8;
    const heightPx = this.heightPx() ?? this.height() * 16;

    if (this.protocol() === 'kitty') {
      this.emitKitty(buffer, widthPx, heightPx, el);
      return;
    }
    const base64 = buffer.toString('base64');
    const inline = `\x1b]1337;File=inline=1;preserveAspectRatio=0;width=${widthPx}px;height=${heightPx}px:${base64}\x07`;
    this.terminal.write(inline);
  }

  /**
   * Emit via the kitty graphics protocol, placed at the component's cell
   * position after the next render pass (the cursor must be positioned
   * there; the diff renderer repaints cells on flush).
   */
  private emitKitty(buffer: Buffer, widthPx: number, heightPx: number, el: HTMLElement): void {
    const payload = buffer.toString('base64');
    const chunkSize = 4096;
    const chunks: string[] = [];
    for (let i = 0; i < payload.length; i += chunkSize) {
      const chunk = payload.slice(i, i + chunkSize);
      const last = i + chunkSize >= payload.length;
      chunks.push(
        `\x1b_Ga=T,f=32,s=${widthPx},v=${heightPx},m=${last ? 0 : 1};${chunk}\x1b\\`,
      );
    }

    const unregister = this.renderService.onFlush(() => {
      const rect = this.renderService.getElementRect(el);
      if (!rect) return;
      unregister();
      this.terminal.write(cursor.moveTo(rect.x, rect.y) + chunks.join(''));
    });
  }
}