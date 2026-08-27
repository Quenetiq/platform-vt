import { Component, inject, input, output, signal, effect, afterNextRender, ElementRef, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { InputService } from '../../services/input.service';
import { FocusService } from '../../services/focus.service';
import { RenderService } from '../../services/render.service';
import { ClickService } from '../../services/click.service';
import { vimTranslate } from '../../keymaps/vim.presets';

/** A node in a {@link TreeComponent}. */
export interface TreeNode {
  /** Display label. */
  label: string;
  /** Child nodes. */
  children?: TreeNode[];
  /** Whether the node starts expanded (defaults to `true`). */
  expanded?: boolean;
}

/** A flattened, visible line of the tree. */
interface VisibleRow {
  node: TreeNode;
  depth: number;
  isLast: boolean;
}

let nextId = 0;

/**
 * A navigable tree with expand/collapse.
 *
 * Renders one line per visible node with connector glyphs (`├─`, `└─`, `│`).
 * Arrow keys move the selection, `left` collapses a selected expanded node,
 * `right` expands a selected collapsed node (or moves into children),
 * `return` toggles. `selected` emits the current {@link TreeNode}.
 *
 * @example
 * ```html
 * <vt-tree [nodes]="treeData()" (selected)="onNode($event)"></vt-tree>
 * ```
 */
@Component({
  selector: 'vt-tree',
  template: '',
})
export class TreeComponent {
  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly renderService = inject(RenderService);
  private readonly inputService = inject(InputService);
  private readonly focusService = inject(FocusService);
  private readonly clickService = inject(ClickService);
  private readonly destroyRef = inject(DestroyRef);

  readonly nodes = input.required<TreeNode[]>();
  readonly autofocus = input<boolean>(false);
  /** Enable vim-style navigation (`j`/`k` move the selection). */
  readonly vim = input<boolean>(false);

  /** Emits the selected node. */
  readonly selected = output<TreeNode>();

  /** Index of the selected visible row. */
  readonly activeIndex = signal(0);

  /** Expansion state keyed by node object identity. */
  private readonly expanded = new Set<TreeNode>();

  private readonly id = `vt-tree-${String(nextId++)}`;
  private readonly isFocused = signal(false);

  constructor() {
    effect(() => {
      const focused = this.focusService.focused();
      this.isFocused.set(focused?.id === this.id);
    });

    effect(() => {
      const el = this.elementRef.nativeElement as HTMLElement;
      const rows = this.visibleRows();
      const active = this.activeIndex();

      el.setAttribute('display', 'flex');
      el.setAttribute('flex-direction', 'column');
      el.setAttribute('flex-shrink', '0');

      while (el.children.length < rows.length) {
        const row = document.createElement('vt-tree-row');
        row.setAttribute('display', 'flex');
        row.setAttribute('flex-direction', 'row');
        row.setAttribute('flex-shrink', '0');
        row.setAttribute('min-height', '1');
        el.appendChild(row);
      }
      while (el.children.length > rows.length) {
        el.lastElementChild?.remove();
      }

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i]!;
        const lineEl = el.children[i] as HTMLElement;
        const prefix = this.prefix(row);
        const isExpanded = this.isExpanded(row.node);
        const hasChildren = (row.node.children?.length ?? 0) > 0;
        const marker = !hasChildren ? '  ' : isExpanded ? '\u25BC ' : '\u25B6 ';
        const text = prefix + marker + row.node.label;
        lineEl.setAttribute('content', text);
        lineEl.textContent = text;
        if (i === active && this.isFocused()) {
          lineEl.setAttribute('color', 'cyan');
          lineEl.setAttribute('background-color', 'gray');
          lineEl.setAttribute('inverse', 'true');
        } else {
          lineEl.removeAttribute('color');
          lineEl.removeAttribute('background-color');
          lineEl.removeAttribute('inverse');
        }
      }
      this.renderService.scheduleRender();
    });

    this.focusService.register({
      id: this.id,
      element: this.elementRef.nativeElement,
      priority: 1,
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
      if (this.autofocus()) this.focusService.focus(this.id);
    });

    this.clickService.register({
      id: this.id,
      element: this.elementRef.nativeElement as HTMLElement,
      onClick: (event, node) => {
        const index = event.y - node.y;
        const rows = this.visibleRows();
        if (index >= 0 && index < rows.length) {
          this.activeIndex.set(index);
          const row = rows[index]!;
          if (this.isExpanded(row.node)) this.collapse(row.node);
          else this.expand(row.node);
          this.selected.emit(row.node);
        }
      },
    });

    this.inputService.keyEvents
      .pipe(
        filter(() => this.isFocused()),
        takeUntilDestroyed(),
      )
      .subscribe((rawEvent) => {
        const event = this.vim() ? vimTranslate(rawEvent) : rawEvent;
        const rows = this.visibleRows();
        if (rows.length === 0) return;
        const index = this.activeIndex();
        const current = rows[index]!;
        switch (event.name) {
          case 'up':
            this.activeIndex.set(Math.max(0, index - 1));
            this.selected.emit(rows[this.activeIndex()]!.node);
            break;
          case 'down':
            this.activeIndex.set(Math.min(rows.length - 1, index + 1));
            this.selected.emit(rows[this.activeIndex()]!.node);
            break;
          case 'left':
            if (this.isExpanded(current.node)) {
              this.collapse(current.node);
            } else if (index > 0) {
              this.activeIndex.set(index - 1);
            }
            break;
          case 'right':
            if (!this.isExpanded(current.node)) {
              this.expand(current.node);
            } else if (index < rows.length - 1) {
              this.activeIndex.set(index + 1);
            }
            break;
          case 'return':
            if (this.isExpanded(current.node)) this.collapse(current.node);
            else this.expand(current.node);
            this.selected.emit(current.node);
            break;
        }
        this.renderService.scheduleRender();
      });

    this.destroyRef.onDestroy(() => {
      this.clickService.unregister(this.id);
      this.focusService.unregister(this.id);
    });
  }

  /** Flatten the node tree into visible rows. */
  private visibleRows(): VisibleRow[] {
    const rows: VisibleRow[] = [];
    const walk = (nodes: TreeNode[], depth: number, last: boolean): void => {
      nodes.forEach((node, i) => {
        rows.push({ node, depth, isLast: i === nodes.length - 1 });
        if (this.isExpanded(node)) {
          void last;
          walk(node.children ?? [], depth + 1, i === nodes.length - 1);
        }
      });
    };
    walk(this.nodes(), 0, true);
    return rows;
  }

  private isExpanded(node: TreeNode): boolean {
    if ((node.children?.length ?? 0) === 0) return false;
    return this.expanded.has(node) ? true : node.expanded !== false;
  }

  private expand(node: TreeNode): void {
    if ((node.children?.length ?? 0) === 0) return;
    this.expanded.add(node);
    this.renderService.scheduleRender();
  }

  private collapse(node: TreeNode): void {
    if ((node.children?.length ?? 0) === 0) return;
    this.expanded.delete(node);
    this.renderService.scheduleRender();
  }

  private prefix(row: VisibleRow): string {
    // Build the ancestry chain to draw ├─/└─/│ connectors.
    let prefix = '';
    const ancestors: boolean[] = [];
    const find = (nodes: TreeNode[], target: TreeNode): boolean => {
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i]!;
        if (n === target) {
          ancestors.push(i === nodes.length - 1);
          return true;
        }
        if (find(n.children ?? [], target)) {
          ancestors.push(i === nodes.length - 1);
          return true;
        }
      }
      return false;
    };
    find(this.nodes(), row.node);
    // ancestors[0] is the outermost level.
    for (let i = ancestors.length - 2; i >= 0; i--) {
      prefix += ancestors[i] ? '   ' : '\u2502  ';
    }
    if (row.depth === 0) return '';
    const glyph = row.isLast ? '\u2514\u2500' : '\u251C\u2500';
    return prefix + glyph + ' ';
  }
}