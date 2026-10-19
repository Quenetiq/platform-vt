import {
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  effect,
  inject,
  input,
  linkedSignal,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { InputService } from '../../services/input.service';
import { FocusService } from '../../services/focus.service';
import { RenderService } from '../../services/render.service';
import { ClickService } from '../../services/click.service';
import { DragService } from '../../services/drag.service';
import { WheelService } from '../../services/wheel.service';
import { TerminalService } from '../../services/terminal.service';
import { createIdGenerator, setStyleAttr } from '../../cdk/dom';

/** Position and size of a window. */
export interface WindowBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * A floating terminal window with a title bar, drag movement, keyboard
 * resizing and z-order management.
 *
 * The window is absolutely positioned inside its parent (usually the app
 * root). Dragging the title bar moves it; clicking anywhere brings it to the
 * front (later DOM siblings paint above earlier ones). With `[resizable]`
 * (default), `ctrl+←/→` and `ctrl+↑/↓` resize the focused window. The body is
 * a scroll viewport — provide `WheelService` to scroll it with the mouse.
 *
 * @example
 * ```html
 * <vt-window title="Settings" [x]="4" [y]="2" [width]="40" [height]="12"
 *   (closed)="settingsOpen.set(false)">
 *   <vt-text content="Window content"></vt-text>
 * </vt-window>
 * ```
 */
@Component({
  selector: 'vt-window',
  template: `
    <div class="vt-window-title"></div>
    <div class="vt-window-body"><ng-content></ng-content></div>
  `,
})
export class WindowComponent {
  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly renderService = inject(RenderService);
  private readonly inputService = inject(InputService);
  private readonly focusService = inject(FocusService);
  private readonly clickService = inject(ClickService);
  private readonly terminal = inject(TerminalService);
  private readonly dragService = inject(DragService, { optional: true });
  private readonly wheelService = inject(WheelService, { optional: true });
  private readonly destroyRef = inject(DestroyRef);

  /** Window title shown in the title bar. */
  readonly title = input<string>('Window');
  /** Initial column of the top-left corner. */
  readonly x = input<number>(0);
  /** Initial row of the top-left corner. */
  readonly y = input<number>(0);
  /** Window width in columns (including borders). */
  readonly width = input<number>(40);
  /** Window height in rows (including borders). */
  readonly height = input<number>(12);
  /** Whether the title bar can be dragged. */
  readonly draggable = input<boolean>(true);
  /** Whether `ctrl+arrows` resize the window. */
  readonly resizable = input<boolean>(true);
  /** Whether the ✕ close affordance is shown. */
  readonly closable = input<boolean>(true);
  /** Minimum width. */
  readonly minWidth = input<number>(12);
  /** Minimum height. */
  readonly minHeight = input<number>(4);
  /** Optional border/background theme colors. */
  readonly color = input<string>('');
  readonly background = input<string>('');

  /** Emitted when the close affordance is activated. */
  readonly closed = output<void>();
  /** Emitted after a drag or resize with the new bounds. */
  readonly boundsChange = output<WindowBounds>();

  /** Current position (dragging updates this locally). */
  readonly position = linkedSignal(() => ({ x: this.x(), y: this.y() }));
  /** Current size (keyboard resizing updates this locally). */
  readonly size = linkedSignal(() => ({ width: this.width(), height: this.height() }));
  /** Whether the window has focus (border accent). */
  readonly isFocused = signal(false);
  /** Whether a drag is in progress. */
  readonly dragging = signal(false);
  /** Body scroll offset. */
  readonly scrollTop = signal(0);

  private readonly id = createIdGenerator('vt-window')();
  private dragOrigin: { x: number; y: number } | null = null;

  constructor() {
    effect(() => {
      const el = this.elementRef.nativeElement;
      const position = this.position();
      const size = this.size();
      const titleEl = el.querySelector<HTMLElement>('.vt-window-title');
      const bodyEl = el.querySelector<HTMLElement>('.vt-window-body');
      const focused = this.isFocused();

      el.setAttribute('display', 'flex');
      el.setAttribute('flex-direction', 'column');
      el.setAttribute('position', 'absolute');
      el.setAttribute('left', String(position.x));
      el.setAttribute('top', String(position.y));
      el.setAttribute('width', String(size.width));
      el.setAttribute('height', String(size.height));
      el.setAttribute('min-width', String(this.minWidth()));
      el.setAttribute('min-height', String(this.minHeight()));
      el.setAttribute('border', 'round');
      el.setAttribute('padding', '1');
      el.setAttribute('flex-shrink', '0');
      el.setAttribute('color', focused ? 'cyan' : this.color());
      setStyleAttr(el, 'background-color', this.background());

      if (titleEl) {
        titleEl.setAttribute('display', 'flex');
        titleEl.setAttribute('flex-direction', 'row');
        titleEl.setAttribute('flex-shrink', '0');
        titleEl.setAttribute('align-self', 'stretch');
        const innerWidth = Math.max(0, size.width - 4);
        const title = this.closable() ? `${this.title()} \u2715` : this.title();
        const text = title.length > innerWidth ? title.slice(0, Math.max(0, innerWidth - 1)) : title;
        titleEl.setAttribute('content', text);
        titleEl.textContent = text;
      }

      if (bodyEl) {
        bodyEl.setAttribute('display', 'flex');
        bodyEl.setAttribute('flex-direction', 'column');
        bodyEl.setAttribute('flex-grow', '1');
        bodyEl.setAttribute('flex-shrink', '1');
        bodyEl.setAttribute('align-self', 'stretch');
        bodyEl.setAttribute('overflow', 'scroll');
        bodyEl.setAttribute('scroll-top', String(this.scrollTop()));
      }

      this.renderService.scheduleRender();
    });

    this.focusService.register({
      id: this.id,
      element: this.elementRef.nativeElement,
      priority: 2,
      onFocus: () => {
        this.isFocused.set(true);
        this.renderService.scheduleRender();
      },
      onBlur: () => {
        this.isFocused.set(false);
        this.renderService.scheduleRender();
      },
    });

    const ref = afterNextRender(() => {
      ref.destroy();
      const titleEl = this.elementRef.nativeElement.querySelector<HTMLElement>('.vt-window-title');
      if (titleEl) {
        this.clickService.register({
          id: `${this.id}-title`,
          element: titleEl,
          onClick: (event, node) => {
            this.bringToFront();
            this.focusService.focus(this.id);
            if (this.closable() && event.x >= node.x + node.width - 3) {
              this.close();
            }
          },
        });
        if (this.draggable() && this.dragService) {
          this.dragService.registerDraggable({
            id: `${this.id}-drag`,
            element: titleEl,
            onDragStart: (event) => {
              this.dragging.set(true);
              this.dragOrigin = { x: event.x, y: event.y };
              this.bringToFront();
              this.focusService.focus(this.id);
            },
            onDragMove: (event) => {
              const origin = this.dragOrigin;
              if (!origin) return;
              this.moveBy(event.x - origin.x, event.y - origin.y);
              this.dragOrigin = { x: event.x, y: event.y };
            },
            onDragEnd: () => {
              this.dragging.set(false);
              this.dragOrigin = null;
              this.emitBounds();
            },
          });
        }
      }

      const bodyEl = this.elementRef.nativeElement.querySelector<HTMLElement>('.vt-window-body');
      if (bodyEl && this.wheelService) {
        this.wheelService.register({
          id: `${this.id}-wheel`,
          element: bodyEl,
          onWheel: (event) => {
            this.scrollTop.update((offset) =>
              Math.max(0, offset + (event.scrollDirection === 'up' ? -1 : 1)),
            );
            this.renderService.scheduleRender();
          },
        });
      }
    });

    this.clickService.register({
      id: this.id,
      element: this.elementRef.nativeElement,
      onClick: () => {
        this.bringToFront();
        this.focusService.focus(this.id);
      },
    });

    this.inputService.keyEvents
      .pipe(
        filter(() => this.isFocused()),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((event) => {
        if (!this.resizable() || !event.ctrl) return;
        if (event.name === 'left') this.resizeBy(-1, 0);
        else if (event.name === 'right') this.resizeBy(1, 0);
        else if (event.name === 'up') this.resizeBy(0, -1);
        else if (event.name === 'down') this.resizeBy(0, 1);
      });

    this.destroyRef.onDestroy(() => {
      this.clickService.unregister(this.id);
      this.clickService.unregister(`${this.id}-title`);
      this.dragService?.unregisterDraggable(`${this.id}-drag`);
      this.wheelService?.unregister(`${this.id}-wheel`);
      this.focusService.unregister(this.id);
    });
  }

  /** Move the window to an absolute position (clamped to the terminal). */
  moveTo(x: number, y: number): void {
    const size = this.size();
    const columns = this.terminal.columns();
    const rows = this.terminal.rows();
    this.position.set({
      x: Math.max(0, Math.min(columns - size.width, Math.round(x))),
      y: Math.max(0, Math.min(rows - size.height, Math.round(y))),
    });
    this.renderService.scheduleRender();
  }

  /** Move the window by a delta. */
  moveBy(dx: number, dy: number): void {
    const position = this.position();
    this.moveTo(position.x + dx, position.y + dy);
  }

  /** Resize the window, clamping to the minimum size and terminal bounds. */
  resizeBy(dx: number, dy: number): void {
    const size = this.size();
    const position = this.position();
    const columns = this.terminal.columns();
    const rows = this.terminal.rows();
    const width = Math.max(this.minWidth(), Math.min(columns - position.x, size.width + dx));
    const height = Math.max(this.minHeight(), Math.min(rows - position.y, size.height + dy));
    this.size.set({ width, height });
    this.scrollTop.set(0);
    this.emitBounds();
    this.renderService.scheduleRender();
  }

  /** Paint this window above the other windows (later DOM siblings win). */
  bringToFront(): void {
    const el = this.elementRef.nativeElement;
    const parent = el.parentElement;
    if (parent && parent.lastElementChild !== el) {
      parent.appendChild(el);
      this.renderService.scheduleRender();
    }
  }

  /** Close the window (emits `closed`). */
  close(): void {
    this.closed.emit();
  }

  /** Current bounds (position + size). */
  bounds(): WindowBounds {
    const position = this.position();
    const size = this.size();
    return { x: position.x, y: position.y, width: size.width, height: size.height };
  }

  private emitBounds(): void {
    this.boundsChange.emit(this.bounds());
    this.renderService.scheduleRender();
  }
}
