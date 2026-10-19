import {
  Component,
  Injectable,
  inject,
  input,
  output,
  signal,
  effect,
  ElementRef,
  DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, type Observable } from 'rxjs';
import { InputService } from '../../services/input.service';
import { RenderService } from '../../services/render.service';
import { ClickService } from '../../services/click.service';
import { OverlayService } from '../../overlay/overlay.service';
import { vimTranslate } from '../../keymaps/vim.presets';
import { createIdGenerator, setCellText, syncChildren } from '../../cdk/dom';

/** A single menu item. */
export interface MenuItem {
  /** Display label. */
  label: string;
  /** Optional shortcut hint shown dimmed on the right. */
  hint?: string;
  /** Disabled items are rendered dimmed and cannot be activated. */
  disabled?: boolean;
  /** Child items open a nested submenu to the right when activated. */
  children?: MenuItem[];
}

/**
 * A keyboard-navigable menu list with nested submenus (used by
 * {@link MenuService} for context menus, or standalone).
 *
 * Arrow keys move the selection, `return`/`space`/`right` activates the
 * selected item. Items with `children` open a nested submenu column to the
 * right; `left`/`escape` navigate back to the parent level (escape at the
 * root emits `cancelled`). `selected` emits the full index path from the
 * root, e.g. `[1, 2]` for the third item of the submenu of the second item.
 *
 * @example
 * ```html
 * <vt-menu
 *   [items]="items()"
 *   (selected)="onSelect($event)"
 *   (cancelled)="close()"
 * ></vt-menu>
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
  /** Enable vim-style navigation (`j`/`k`/`h`/`l` move the selection). */
  readonly vim = input<boolean>(false);
  /** Emits the index path of the activated item, e.g. `[1, 2]`. */
  readonly selected = output<number[]>();
  readonly cancelled = output<void>();

  /** Stack of submenu indices; empty at the root level. */
  readonly activePath = signal<number[]>([]);
  /** Index of the highlighted item in the current (deepest) level. */
  readonly activeIndex = signal(0);

  private readonly id = createIdGenerator('vt-menu')();

  constructor() {
    effect(() => {
      const el = this.elementRef.nativeElement as HTMLElement;
      const levels = this.levels();
      const active = this.activeIndex();

      el.setAttribute('display', 'flex');
      el.setAttribute('flex-direction', 'row');
      el.setAttribute('flex-shrink', '0');
      el.setAttribute('gap', '1');

      const columns = syncChildren(el, levels.length, 'vt-menu-column', {
        display: 'flex',
        'flex-direction': 'column',
        'flex-shrink': '0',
        border: 'single',
        padding: '1',
      });

      for (let level = 0; level < levels.length; level++) {
        const column = columns[level]!;
        const items = levels[level]!;
        const longest = Math.max(0, ...items.map((item) => item.label.length));
        const width = longest + 4;
        column.setAttribute('width', String(width + 6));

        const rows = syncChildren(column, items.length, 'vt-menu-item', {
          display: 'flex',
          'flex-direction': 'row',
          'flex-shrink': '0',
          'min-height': '1',
        });

        for (let i = 0; i < items.length; i++) {
          const item = items[i]!;
          const row = rows[i]!;
          const isActive = level === levels.length - 1 && i === active && !item.disabled;
          const glyph = item.disabled ? '\u00B7' : isActive ? '\u203A' : ' ';
          const label = `${glyph} ${item.label}`;
          const hasChildren = (item.children?.length ?? 0) > 0;
          const indicator = hasChildren ? ' \u203A' : '';
          const hintPad = ' '.repeat(Math.max(1, width - label.length - indicator.length));
          const text = `${label}${hintPad}${item.hint ?? ''}${indicator}`;
          setCellText(row, text);
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
      }
      this.renderService.scheduleRender();
    });

    this.clickService.register({
      id: this.id,
      element: this.elementRef.nativeElement as HTMLElement,
      onClick: (event) => {
        const hit = this.hitTest(event.x, event.y);
        if (!hit) return;
        if (hit.item.children?.length) {
          this.openSubmenu(hit.level, hit.index);
        } else {
          this.activate(hit.level, hit.index);
        }
      },
    });

    this.inputService.keyEvents.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((rawEvent) => {
      const event = this.vim() ? vimTranslate(rawEvent) : rawEvent;
      const level = this.activePath().length;
      const items = this.levels()[level];
      if (!items || items.length === 0) return;
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
        case 'right':
        case 'return':
        case ' ':
          if (items[current]?.children?.length) {
            this.openSubmenu(level, current);
          } else {
            this.activate(level, current);
          }
          break;
        case 'left':
          this.closeSubmenu();
          break;
        case 'escape':
          if (this.activePath().length > 0) this.closeSubmenu();
          else this.cancelled.emit();
          break;
      }
    });

    this.destroyRef.onDestroy(() => {
      this.clickService.unregister(this.id);
    });
  }

  /** The visible item lists, one per open level (root first). */
  private levels(): MenuItem[][] {
    const path = this.activePath();
    const levels: MenuItem[][] = [this.items()];
    for (const index of path) {
      const children = levels[levels.length - 1]![index]?.children;
      if (!children || children.length === 0) break;
      levels.push(children);
    }
    return levels;
  }

  /** Map a terminal point to the item under it, using rendered geometry. */
  private hitTest(x: number, y: number): { level: number; index: number; item: MenuItem } | null {
    const el = this.elementRef.nativeElement as HTMLElement;
    const levels = this.levels();
    for (let level = 0; level < el.children.length && level < levels.length; level++) {
      const column = el.children[level] as HTMLElement;
      const columnNode = this.renderService.getElementLayout(column);
      if (!columnNode) continue;
      if (x < columnNode.x || x >= columnNode.x + columnNode.width) continue;

      for (let i = 0; i < column.children.length; i++) {
        const row = column.children[i] as HTMLElement;
        const rowNode = this.renderService.getElementLayout(row);
        if (!rowNode) continue;
        if (y >= rowNode.y && y < rowNode.y + rowNode.height) {
          const item = levels[level]![i];
          if (!item) return null;
          return { level, index: i, item };
        }
      }
      return null;
    }
    return null;
  }

  /** Open the submenu of the item at the given level and index. */
  private openSubmenu(level: number, index: number): void {
    const items = this.levels()[level]!;
    const item = items[index];
    if (!item || item.disabled || !item.children?.length) return;
    this.activePath.set([...this.activePath().slice(0, level), index]);
    this.activeIndex.set(this.nextEnabled(item.children, -1, 1) ?? 0);
    this.renderService.scheduleRender();
  }

  /** Close the deepest open submenu. */
  private closeSubmenu(): void {
    const path = this.activePath();
    if (path.length === 0) return;
    const parentLevel = path.length - 1;
    this.activeIndex.set(path[path.length - 1]!);
    this.activePath.set(path.slice(0, parentLevel));
    this.renderService.scheduleRender();
  }

  private nextEnabled(items: MenuItem[], from: number, dir: 1 | -1): number | null {
    for (let step = 1; step <= items.length; step++) {
      const index = (from + dir * step + items.length) % items.length;
      if (!items[index]!.disabled) return index;
    }
    return null;
  }

  private activate(level: number, index: number): void {
    const items = this.levels()[level]!;
    const item = items[index];
    if (!item || item.disabled) return;
    this.activeIndex.set(index);
    this.selected.emit([...this.activePath().slice(0, level), index]);
    this.renderService.scheduleRender();
  }
}

/**
 * Opens {@link MenuComponent} context menus at a terminal position.
 *
 * The menu is an overlay panel: keyboard input (arrows, return, escape) is
 * routed to it while it is open. `select` emits the chosen item index path
 * (e.g. `[1]` or `[1, 2]` for a submenu item), `cancel` fires when the menu
 * is dismissed without a choice.
 *
 * @example
 * ```typescript
 * const menus = inject(MenuService);
 * menus.open(
 *   [
 *     { label: 'Copy', hint: 'Ctrl+C' },
 *     {
 *       label: 'Edit',
 *       children: [
 *         { label: 'Undo' },
 *         { label: 'Redo' },
 *       ],
 *     },
 *   ],
 *   event.x,
 *   event.y,
 * ).select.subscribe((path) => console.log('chose', path));
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
  ): { select: Observable<number[]>; cancel: Observable<void>; close: () => void } {
    const overlay = this.overlayService.create({ closeOnEscape: false });
    const componentRef = overlay.attach(MenuComponent, { items });
    overlay.setPosition(x, y);

    const menu = componentRef.instance;
    const select = new Subject<number[]>();
    const cancel = new Subject<void>();
    let closed = false;
    const close = (): void => {
      if (closed) return;
      closed = true;
      overlay.dispose();
      select.complete();
      cancel.complete();
    };

    menu.selected.subscribe((path) => {
      select.next(path);
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
