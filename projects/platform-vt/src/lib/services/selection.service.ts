import {
  DestroyRef,
  Injectable,
  inject,
  Injector,
  InjectionToken,
  computed,
  makeEnvironmentProviders,
  signal,
  type EnvironmentProviders,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import type { CellRegion } from '../output/screen-buffer';
import { ClipboardService } from './clipboard.service';
import { InputService } from './input.service';
import { MouseService } from './mouse.service';
import { RenderService } from './render.service';

/** Options for the selection service. */
export interface SelectionOptions {
  /**
   * Start a selection with a plain left-button drag (no Shift), copying on
   * release — "copy on select". A click without movement does not select.
   * Shift+click still adds regions. Defaults to `false`.
   */
  dragToSelect?: boolean;
}

/** DI token carrying the selection options (see {@link provideSelectionService}). */
export const SELECTION_OPTIONS = new InjectionToken<SelectionOptions>('vt-selection-options');

/**
 * Normalize a region from two arbitrary points (inclusive).
 */
export function normalizeRegion(x1: number, y1: number, x2: number, y2: number): CellRegion {
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
 * - Another Shift+click starts an **additional** region (multi-region
 *   selection); the renderer highlights all regions and copying joins their
 *   texts with newlines.
 * - The selected regions are rendered in reverse video (see
 *   `TerminalRenderOptions.selection`).
 * - On release (and on Ctrl+C while a selection exists) the selected text is
 *   copied to the system clipboard via OSC 52.
 * - `escape` clears all selections.
 *
 * The render service picks the regions up automatically when the service is
 * provided (see {@link provideSelectionService}).
 *
 * @example
 * ```typescript
 * const selection = inject(SelectionService);
 * selection.regions.subscribe(() => console.log('selection changed'));
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
  private readonly options: SelectionOptions = inject(SELECTION_OPTIONS, { optional: true }) ?? {};

  /** All currently selected regions (inclusive), in order. */
  readonly regions = signal<CellRegion[]>([]);

  /** The most recent region, or null (kept for backward compatibility). */
  readonly region = computed<CellRegion | null>(() => {
    const list = this.regions();
    return list.length === 0 ? null : list[list.length - 1]!;
  });

  private anchor: { x: number; y: number } | null = null;
  private selecting = false;
  private dragged = false;

  constructor() {
    // Shift+click starts (or adds) a selection at the click point.
    this.mouse.clicks
      .pipe(
        filter((click) => click.shift),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((click) => {
        this.selecting = true;
        this.anchor = { x: click.x, y: click.y };
        const point = { x1: click.x, y1: click.y, x2: click.x, y2: click.y };
        this.regions.update((list) => [...list, point]);
      });

    // With dragToSelect, a plain button press arms a selection that only
    // materializes once the mouse moves (so plain clicks do not select).
    this.mouse.mouseEvents
      .pipe(
        filter(() => this.options.dragToSelect === true),
        filter((event) => event.type === 'down' && event.button === 'left'),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((event) => {
        this.selecting = true;
        this.dragged = false;
        this.anchor = { x: event.x, y: event.y };
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
        this.dragged = true;
        const region = normalizeRegion(anchor.x, anchor.y, event.x, event.y);
        this.regions.update((list) => [...list.slice(0, -1), region]);
      });

    // Release completes the selection and copies all regions.
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

        // dragToSelect: a press+release without movement is a plain click —
        // do not leave a stale one-cell region behind.
        if (!this.dragged && this.options.dragToSelect === true) {
          this.regions.set([]);
          this.dragged = false;
          return;
        }
        this.dragged = false;

        const region = normalizeRegion(anchor.x, anchor.y, event.x, event.y);
        this.regions.update((list) => [...list.slice(0, -1), region]);
        this.copyRegions();
      });

    // Escape clears the selections.
    this.input.keyEvents
      .pipe(
        filter((event) => event.name === 'escape'),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        if (this.regions().length > 0) this.regions.set([]);
      });

    // Ctrl+C copies the current selections.
    this.input.keyEvents
      .pipe(
        filter((event) => event.ctrl && event.name === 'c'),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        this.copyRegions();
      });
  }

  /** Clear all selections. */
  clear(): void {
    this.selecting = false;
    this.anchor = null;
    this.regions.set([]);
  }

  private copyRegions(): void {
    const regions = this.regions();
    if (regions.length === 0) return;

    // Lazy access through the Injector breaks the RenderService ↔
    // SelectionService dependency cycle.
    const render = this.injector.get(RenderService, null, { optional: true });
    if (!render) return;

    const parts: string[] = [];
    for (const region of regions) {
      const text = render.getText(region);
      if (text) parts.push(text);
    }
    const text = parts.join('\n');
    if (text.trim().length > 0) {
      this.clipboard.copy(text);
    }
  }
}

/**
 * Provide the text selection service.
 *
 * @param options - Optional selection behavior (see {@link SelectionOptions});
 * `{ dragToSelect: true }` enables copy-on-select with a plain drag.
 */
export function provideSelectionService(options: SelectionOptions = {}): EnvironmentProviders {
  return makeEnvironmentProviders([
    SelectionService,
    { provide: SELECTION_OPTIONS, useValue: options },
  ]);
}
