import { DestroyRef, Injectable, inject, Injector, makeEnvironmentProviders, signal, type EnvironmentProviders } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import type { CellRegion } from '../output/screen-buffer';
import { ClipboardService } from './clipboard.service';
import { InputService } from './input.service';
import { MouseService } from './mouse.service';
import { RenderService } from './render.service';

/** Normalize a region from two arbitrary points (inclusive). */
export function normalizeRegion(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): CellRegion {
  return {
    x1: Math.min(x1, x2),
    y1: Math.min(y1, y2),
    x2: Math.max(x1, x2),
    y2: Math.max(y1, y2),
  };
}

/**
 * Text selection with the mouse (Shift+drag) and copy.
 *
 * - Shift+click starts a selection; dragging extends it; release completes it.
 * - The selected region is rendered in reverse video (see
 *   `TerminalRenderOptions.selection`).
 * - On release (and on Ctrl+C while a selection exists) the selected text is
 *   copied to the system clipboard via OSC 52.
 * - `escape` clears the selection.
 *
 * The render service picks the region up automatically when the service is
 * provided (see {@link provideSelectionService}).
 *
 * @example
 * ```typescript
 * const selection = inject(SelectionService);
 * selection.region.subscribe(() => console.log('selection changed'));
 * selection.clear();
 * ```
 */
@Injectable()
export class SelectionService {
  private readonly mouse = inject(MouseService);
  private readonly input = inject(InputService);
  private readonly clipboard = inject(ClipboardService);
  private readonly injector = inject(Injector);
  private readonly destroyRef = inject(DestroyRef);

  /** The currently selected region (inclusive), or null. */
  readonly region = signal<CellRegion | null>(null);

  private anchor: { x: number; y: number } | null = null;
  private selecting = false;

  constructor() {
    // Shift+click starts a selection at the click point.
    this.mouse.clicks
      .pipe(
        filter((click) => click.shift),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((click) => {
        this.selecting = true;
        this.anchor = { x: click.x, y: click.y };
        this.region.set({ x1: click.x, y1: click.y, x2: click.x, y2: click.y });
      });

    // Drag (motion while a button is held) extends the selection.
    this.mouse.mouseEvents
      .pipe(
        filter((event) => event.type === 'move'),
        filter(() => this.selecting && this.anchor !== null),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((event) => {
        const anchor = this.anchor!;
        this.region.set(normalizeRegion(anchor.x, anchor.y, event.x, event.y));
      });

    // Release completes the selection and copies the text.
    this.mouse.mouseEvents
      .pipe(
        filter((event) => event.type === 'up'),
        filter(() => this.selecting && this.anchor !== null),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((event) => {
        const anchor = this.anchor!;
        this.selecting = false;
        this.anchor = null;
        const region = normalizeRegion(anchor.x, anchor.y, event.x, event.y);
        this.region.set(region);
        this.copyRegion(region);
      });

    // Escape clears the selection.
    this.input.keyEvents
      .pipe(
        filter((event) => event.name === 'escape'),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        if (this.region()) this.region.set(null);
      });

    // Ctrl+C copies the current selection.
    this.input.keyEvents
      .pipe(
        filter((event) => event.ctrl && event.name === 'c'),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        const region = this.region();
        if (region) this.copyRegion(region);
      });
  }

  /** Clear the selection. */
  clear(): void {
    this.selecting = false;
    this.anchor = null;
    this.region.set(null);
  }

  private copyRegion(region: CellRegion): void {
    // Lazy access through the Injector breaks the RenderService ↔
    // SelectionService dependency cycle.
    const render = this.injector.get(RenderService, null, { optional: true });
    if (!render) return;
    const text = render.getText(region);
    if (text && text.trim().length > 0) {
      this.clipboard.copy(text);
    }
  }
}

/**
 * Provide the text selection service.
 */
export function provideSelectionService(): EnvironmentProviders {
  return makeEnvironmentProviders([SelectionService]);
}