import { Component, Injectable, inject, input, output, signal, effect, ElementRef, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, type Observable } from 'rxjs';
import { InputService } from '../../services/input.service';
import { RenderService } from '../../services/render.service';
import { ClickService } from '../../services/click.service';
import { OverlayService } from '../../overlay/overlay.service';
import { vimTranslate } from '../../keymaps/vim.presets';

/** A single menu item. */
export interface MenuItem {
  /** Display label. */
  label: string;
  /** Optional shortcut hint shown dimmed on the right. */
  hint?: string;
  /** Disabled items are rendered dimmed and cannot be activated. */
  disabled?: boolean;
}

/**
 * A keyboard-navigable menu list (used by {@link MenuService} for context
 * menus, or standalone).
 *
 * Arrow keys move the selection, `return` activates the selected item
 * (emitting `selected` with its index), `escape` emits `cancelled`. Items
 * are rendered as `› label`, with hints right-aligned and disabled items
 * dimmed.
 *
 * @example
 * ```html
 * <vt-menu [items]="items()" (selected)="onSelect($event)" (cancelled)="close()"></vt-menu>
 * ```
 */
@Component({
  selector: 'vt-menu',
  template: '',
})
export class MenuComponent {
  private readonly elementRef = inject(ElementRef);
  private readonly renderService = inject(RenderService);
  private readonly inputService = inject(InputService);
  private readonly clickService = inject(ClickService);
  private readonly destroyRef = inject(DestroyRef);

  readonly items = input.required<MenuItem[]>();
  /** Enable vim-style navigation (`j`/`k` move the selection). */
  readonly vim = input<boolean>(false);
  readonly selected = output<number>();
  readonly cancelled = output<void>();

  /** Index of the currently highlighted item. */
  readonly activeIndex = signal(0);

  private readonly id = `vt-menu-${String(menuId++)}`;

  constructor() {
    effect(() => {
      const el = this.elementRef.nativeElement as HTMLElement;
      const items = this.items();
      const active = this.activeIndex();
      const longest = Math.max(0, ...items.map((item) => item.label.length));
      const width = longest + 4;

      el.setAttribute('display', 'flex');
      el.setAttribute('flex-direction', 'column');
      el.setAttribute('flex-shrink', '0');
      el.setAttribute('border', 'single');
      el.setAttribute('padding', '1');
      el.setAttribute('width', String(width + 6));

      while (el.children.length < items.length) {
        const row = document.createElement('vt-menu-item');
        row.setAttribute('display', 'flex');
        row.setAttribute('flex-direction', 'row');
        row.setAttribute('flex-shrink', '0');
        row.setAttribute('min-height', '1');
        el.appendChild(row);
      }
      while (el.children.length > items.length) {
        el.lastElementChild?.remove();
      }

      for (let i = 0; i < items.length; i++) {
        const item = items[i]!;
        const row = el.children[i] as HTMLElement;
        const isActive = i === active && !item.disabled;
        const glyph = item.disabled ? '\u00B7' : isActive ? '\u203A' : ' ';
        const label = `${glyph} ${item.label}`;
        const hintPad = ' '.repeat(Math.max(1, width - label.length));
        const text = `${label}${hintPad}${item.hint ?? ''}`;
        row.setAttribute('content', text);
        row.textContent = text;
        if (isActive) {
          row.setAttribute('color', 'bright-white');
          row.setAttribute('inverse', 'true');
          row.removeAttribute('opacity');
        } else {
          row.removeAttribute('color');
          row.removeAttribute('inverse');
          if (item.disabled) row.setAttribute('opacity', 'dim');
          else row.removeAttribute('opacity');
        }
      }
      this.renderService.scheduleRender();
    });

    this.clickService.register({
      id: this.id,
      element: this.elementRef.nativeElement as HTMLElement,
      onClick: (event, node) => {
        const index = event.y - node.y - 1;
        const items = this.items();
        if (index >= 0 && index < items.length && !items[index]!.disabled) {
          this.activate(index);
        }
      },
    });

    this.inputService.keyEvents
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((rawEvent) => {
        const event = this.vim() ? vimTranslate(rawEvent) : rawEvent;
        const items = this.items();
        if (items.length === 0) return;
        const current = this.activeIndex();
        switch (event.name) {
          case 'up': {
            const next = this.nextEnabled(items, current, -1);
            if (next !== null) {
              this.activeIndex.set(next);
              this.renderService.scheduleRender();
            }
            break;
          }
          case 'down': {
            const next = this.nextEnabled(items, current, 1);
            if (next !== null) {
              this.activeIndex.set(next);
              this.renderService.scheduleRender();
            }
            break;
          }
          case 'return':
          case ' ':
            this.activate(current);
            break;
          case 'escape':
            this.cancelled.emit();
            break;
        }
      });

    this.destroyRef.onDestroy(() => {
      this.clickService.unregister(this.id);
    });
  }

  private nextEnabled(items: MenuItem[], from: number, dir: 1 | -1): number | null {
    for (let step = 1; step <= items.length; step++) {
      const index = (from + dir * step + items.length) % items.length;
      if (!items[index]!.disabled) return index;
    }
    return null;
  }

  private activate(index: number): void {
    const items = this.items();
    if (index < 0 || index >= items.length || items[index]!.disabled) return;
    this.activeIndex.set(index);
    this.selected.emit(index);
    this.renderService.scheduleRender();
  }
}

let menuId = 0;

/**
 * Opens {@link MenuComponent} context menus at a terminal position.
 *
 * The menu is an overlay panel: keyboard input (arrows, return, escape) is
 * routed to it while it is open. `select` emits the chosen item index,
 * `cancel` fires when the menu is dismissed without a choice.
 *
 * @example
 * ```typescript
 * const menus = inject(MenuService);
 * menus.open(
 *   [
 *     { label: 'Copy', hint: 'Ctrl+C' },
 *     { label: 'Delete', disabled: true },
 *   ],
 *   event.x,
 *   event.y,
 * ).select.subscribe((index) => console.log('chose', index));
 * ```
 */
@Injectable()
export class MenuService {
  private readonly overlayService = inject(OverlayService);
  private readonly renderService = inject(RenderService);

  /** Open a context menu at (x, y). */
  open(
    items: MenuItem[],
    x: number,
    y: number,
  ): { select: Observable<number>; cancel: Observable<void>; close: () => void } {
    const overlay = this.overlayService.create({ closeOnEscape: false });
    const componentRef = overlay.attach(MenuComponent, { items });
    overlay.setPosition(x, y);

    const menu = componentRef.instance;
    const select = new Subject<number>();
    const cancel = new Subject<void>();
    let closed = false;
    const close = (): void => {
      if (closed) return;
      closed = true;
      overlay.dispose();
      select.complete();
      cancel.complete();
    };

    menu.selected.subscribe((index) => {
      select.next(index);
      close();
    });
    menu.cancelled.subscribe(() => {
      cancel.next();
      close();
    });

    this.renderService.scheduleRender();
    return { select, cancel, close };
  }
}