import { Component, inject, input, output, effect, ElementRef, DestroyRef, type OnDestroy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { InputService } from '../../services/input.service';
import { MouseService } from '../../services/mouse.service';
import { RenderService } from '../../services/render.service';
import { KeymapService } from '../../services/keymap.service';

let nextId = 0;

/**
 * A split view with two panels and a draggable divider.
 *
 * The first two projected elements become the panels; a divider glyph
 * between them can be dragged with the mouse or resized with `ctrl-left`/
 * `ctrl-right` (row) or `ctrl-up`/`ctrl-down` (column). Panel sizes follow
 * the flex-grow ratio `ratio` / `1 - ratio`; changes are emitted via
 * `ratioChange` (0–1).
 *
 * @example
 * ```html
 * <vt-split-view direction="row" [ratio]="ratio()" (ratioChange)="ratio.set($event)">
 *   <vt-box>left pane</vt-box>
 *   <vt-box>right pane</vt-box>
 * </vt-split-view>
 * ```
 */
@Component({
  selector: 'vt-split-view',
  template: '<ng-content></ng-content>',
})
export class SplitViewComponent implements OnDestroy {
  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly renderService = inject(RenderService);
  private readonly mouse = inject(MouseService);
  private readonly input = inject(InputService);
  private readonly keys = inject(KeymapService);
  private readonly destroyRef = inject(DestroyRef);

  /** `'row'` = side-by-side (vertical divider), `'column'` = stacked (horizontal divider). */
  readonly direction = input<'row' | 'column'>('row');

  /** Divider position as a fraction (0–1) of the container's main axis. */
  readonly ratio = input<number>(0.5);

  /** Divider glyph (defaults to `│` for rows, `─` for columns). */
  readonly dividerChar = input<string>('');

  /** Grow factor for the split container. */
  readonly flexGrow = input<number>(0);

  readonly ratioChange = output<number>();

  private readonly id = `vt-split-${String(nextId++)}`;
  private readonly unbinders: (() => void)[] = [];
  private dragging = false;

  /** Re-applies the split layout when the projected content changes. */
  private readonly observer: MutationObserver;

  constructor() {
    const el = this.elementRef.nativeElement;
    this.observer = new MutationObserver(() => {
      this.applyLayout();
    });
    this.observer.observe(el, { childList: true });
    this.destroyRef.onDestroy(() => this.observer.disconnect());

    effect(() => {
      // Re-apply when the reactive inputs change (and on first run).
      void this.ratio();
      void this.direction();
      void this.dividerChar();
      this.applyLayout();
    });

    // Mouse drag on the divider.
    this.mouse.clicks
      .pipe(
        filter((click) => click.button === 'left'),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((click) => {
        const divider = this.dividerElement();
        if (divider && this.containsPoint(divider, click.x, click.y)) {
          this.dragging = true;
        }
      });

    this.mouse.mouseEvents
      .pipe(
        filter((event) => this.dragging && event.type === 'move'),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((event) => {
        this.setRatioFromPointer(event.x, event.y);
      });

    this.mouse.mouseEvents
      .pipe(
        filter((event) => event.type === 'up' && this.dragging),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        this.dragging = false;
      });

    // Keyboard resize: ctrl+arrow in the split direction.
    this.input.keyEvents
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((event) => {
        if (!event.ctrl) return;
        const isRow = this.direction() === 'row';
        if ((event.name === 'left' && isRow) || (event.name === 'up' && !isRow)) {
          this.nudge(-0.05);
        } else if ((event.name === 'right' && isRow) || (event.name === 'down' && !isRow)) {
          this.nudge(0.05);
        }
      });

    // Semantic keymap bindings.
    this.unbinders.push(
      this.keys.bind('resize-decrease', () => this.nudge(-0.05)),
      this.keys.bind('resize-increase', () => this.nudge(0.05)),
    );
  }

  /** Apply the split sizing and divider to the projected panels. */
  private applyLayout(): void {
    const el = this.elementRef.nativeElement as HTMLElement;
    const direction = this.direction();
    const ratio = Math.min(0.95, Math.max(0.05, this.ratio()));

    el.setAttribute('display', 'flex');
    el.setAttribute('flex-direction', direction);
    el.setAttribute('flex-shrink', '0');
    el.setAttribute('flex-grow', String(this.flexGrow()));
    el.setAttribute('min-height', '1');

    // Panels: the projected elements (not our divider).
    const panelEls = Array.from(el.children).filter(
      (c) => c.getAttribute('vt-split-panel') !== 'divider',
    ) as HTMLElement[];
    if (panelEls.length > 0) {
      panelEls[0]!.setAttribute('flex-grow', String(ratio));
      panelEls[0]!.setAttribute('flex-shrink', '0');
      if (panelEls.length > 1) {
        panelEls[1]!.setAttribute('flex-grow', String(1 - ratio));
        panelEls[1]!.setAttribute('flex-shrink', '0');
      }
    }

    // Divider element, inserted between the panels.
    let divider = Array.from(el.children).find(
      (c) => c.getAttribute('vt-split-panel') === 'divider',
    ) as HTMLElement | undefined;
    if (!divider) {
      divider = document.createElement('span');
      divider.setAttribute('vt-split-panel', 'divider');
      divider.setAttribute('display', 'block');
      divider.setAttribute('flex-shrink', '0');
      divider.setAttribute('min-height', '1');
      divider.setAttribute('vt-split-id', this.id);
      el.insertBefore(divider, panelEls[1] ?? null);
    }
    const glyph = this.dividerChar() || (direction === 'row' ? '\u2502' : '\u2500');
    divider.setAttribute('content', glyph);
    divider.textContent = glyph;
    divider.setAttribute('color', 'gray');

    this.renderService.scheduleRender();
  }

  private dividerElement(): Element | null {
    const el = this.elementRef.nativeElement as HTMLElement;
    return (
      Array.from(el.children).find((c) => c.getAttribute('vt-split-id') === this.id) ?? null
    );
  }

  private containsPoint(el: Element, x: number, y: number): boolean {
    const rect = this.renderService.getElementRect(el);
    if (!rect) return false;
    return x >= rect.x && x < rect.x + rect.width && y >= rect.y && y < rect.y + rect.height;
  }

  private setRatioFromPointer(x: number, y: number): void {
    const rect = this.renderService.getElementRect(this.elementRef.nativeElement);
    if (!rect) return;
    const isRow = this.direction() === 'row';
    const total = isRow ? rect.width : rect.height;
    if (total <= 1) return;
    const pos = isRow ? x - rect.x : y - rect.y;
    this.emitRatio(pos / total);
  }

  private nudge(delta: number): void {
    this.emitRatio(this.ratio() + delta);
  }

  private emitRatio(value: number): void {
    const clamped = Math.min(0.95, Math.max(0.05, value));
    this.ratioChange.emit(clamped);
    this.renderService.scheduleRender();
  }

  ngOnDestroy(): void {
    for (const unbind of this.unbinders) unbind();
  }
}