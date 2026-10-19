import {
  Component,
  inject,
  input,
  output,
  signal,
  effect,
  afterNextRender,
  ElementRef,
  DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { InputService } from '../../services/input.service';
import { FocusService } from '../../services/focus.service';
import { RenderService } from '../../services/render.service';
import { ClickService } from '../../services/click.service';
import { vimTranslate } from '../../keymaps/vim.presets';
import { createIdGenerator } from '../../cdk/dom';

/** A node in a {@link TreeComponent}. */
export interface TreeNode {
  /** Display label. */
  label: string;
  /** Child nodes. Omit when children are loaded lazily. */
  children?: TreeNode[];
  /** Whether the node starts expanded (defaults to `true`). */
  expanded?: boolean;
}

/** Loader for lazy tree nodes. */
export type TreeNodeLoader = (node: TreeNode) => Promise<TreeNode[]>;

/** A flattened, visible line of the tree. */
interface VisibleRow {
  node: TreeNode;
  depth: number;
  isLast: boolean;
}

/**
 * A navigable tree with expand/collapse, multi-select, checkboxes, lazy
 * children and filtering.
 *
 * Renders one line per visible node with connector glyphs (`├─`, `└─`, `│`).
 * Arrow keys move the selection, `left` collapses a selected expanded node,
 * `right` expands a selected collapsed node (or moves into children),
 * `return` toggles, `space` toggles the checkbox in multi-select mode, and
 * `selected` emits the current {@link TreeNode}.
 *
 * - **Multi-select**: `[multiSelect]="true"` (or `[checkboxes]="true"`)
 *   tracks a set of checked nodes; `selectionChange` emits them.
 * - **Lazy children**: `[loadChildren]="loader"` is called the first time a
 *   node without `children` is expanded.
 * - **Filtering**: `[filter]="text"` shows matching nodes and their
 *   ancestors, ignoring the expansion state.
 *
 * @example
 * ```html
 * <vt-tree [nodes]="treeData()" [checkboxes]="true"
 *   [filter]="query()" [loadChildren]="load"
 *   (selected)="onNode($event)"
 *   (selectionChange)="onChecked($event)"></vt-tree>
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

  /** Allow checking several nodes at once. */
  readonly multiSelect = input<boolean>(false);

  /** Show checkboxes (implies multi-select). */
  readonly checkboxes = input<boolean>(false);

  /** Case-insensitive filter over node labels; ancestors stay visible. */
  readonly filter = input<string>('');

  /** Lazy loader called when a node without `children` is expanded. */
  readonly loadChildren = input<TreeNodeLoader | null>(null);

  /** Emits the active (highlighted) node. */
  readonly selected = output<TreeNode>();

  /** Emits the checked nodes in multi-select mode. */
  readonly selectionChange = output<TreeNode[]>();

  /** Index of the selected visible row. */
  readonly activeIndex = signal(0);

  /** Checked nodes (multi-select mode). */
  readonly checkedNodes = signal<TreeNode[]>([]);

  /** Nodes currently being loaded lazily. */
  readonly loading = signal<TreeNode[]>([]);

  /** Explicit expansion state keyed by node object identity. */
  private readonly expansion = signal(new Map<TreeNode, boolean>());

  /** Children resolved by the lazy loader. */
  private readonly loadedChildren = signal(new Map<TreeNode, TreeNode[]>());

  private readonly id = createIdGenerator('vt-tree')();
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
      const multiple = this.isMultiple();

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
        const hasChildren = this.hasChildren(row.node);
        const loading = this.loading().includes(row.node);
        const marker = loading ? '\u22EF ' : !hasChildren ? '  ' : isExpanded ? '\u25BC ' : '\u25B6 ';
        const check = multiple ? `${this.isChecked(row.node) ? '[x]' : '[ ]'} ` : '';
        const text = prefix + marker + check + row.node.label;
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
          void this.toggleExpanded(row.node);
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
        const index = Math.min(this.activeIndex(), rows.length - 1);
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
              void this.expand(current.node);
            } else if (index < rows.length - 1) {
              this.activeIndex.set(index + 1);
            }
            break;
          case ' ':
            if (this.isMultiple()) {
              this.toggleChecked(current.node);
            } else {
              this.selected.emit(current.node);
            }
            break;
          case 'return':
            void this.toggleExpanded(current.node);
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

  /** Whether the tree currently uses multi-select semantics. */
  isMultiple(): boolean {
    return this.multiSelect() || this.checkboxes();
  }

  /** Whether a node is checked. */
  isChecked(node: TreeNode): boolean {
    return this.checkedNodes().includes(node);
  }

  /** Toggle a node's checked state (multi-select). */
  toggleChecked(node: TreeNode): void {
    const checked = this.checkedNodes();
    this.checkedNodes.set(
      checked.includes(node) ? checked.filter((candidate) => candidate !== node) : [...checked, node],
    );
    this.selectionChange.emit(this.checkedNodes());
    this.renderService.scheduleRender();
  }

  /** Add every visible node to the checked set. */
  checkAllVisible(): void {
    if (!this.isMultiple()) return;
    this.checkedNodes.set(this.visibleRows().map((row) => row.node));
    this.selectionChange.emit(this.checkedNodes());
    this.renderService.scheduleRender();
  }

  /** Clear the checked set. */
  clearChecked(): void {
    if (this.checkedNodes().length === 0) return;
    this.checkedNodes.set([]);
    this.selectionChange.emit(this.checkedNodes());
    this.renderService.scheduleRender();
  }

  /** Flatten the node tree into visible rows. */
  private visibleRows(): VisibleRow[] {
    const filterText = this.filter().trim().toLowerCase();
    const matches = new Map<TreeNode, boolean>();

    const nodeMatches = (node: TreeNode): boolean => {
      const cached = matches.get(node);
      if (cached !== undefined) return cached;
      const selfMatch = filterText.length === 0 || node.label.toLowerCase().includes(filterText);
      const childMatch =
        filterText.length > 0 && this.childrenOf(node).some((child) => nodeMatches(child));
      const result = selfMatch || childMatch;
      matches.set(node, result);
      return result;
    };

    const rows: VisibleRow[] = [];
    const walk = (nodes: TreeNode[], depth: number): void => {
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i]!;
        if (filterText.length > 0 && !nodeMatches(node)) continue;
        rows.push({ node, depth, isLast: i === nodes.length - 1 });
        const expanded = filterText.length > 0 || this.isExpanded(node);
        if (expanded) {
          walk(this.childrenOf(node), depth + 1);
        }
      }
    };
    walk(this.nodes(), 0);
    return rows;
  }

  private childrenOf(node: TreeNode): TreeNode[] {
    return node.children ?? this.loadedChildren().get(node) ?? [];
  }

  private isExpanded(node: TreeNode): boolean {
    if (!this.hasChildren(node)) return false;
    const state = this.expansion();
    // Lazy nodes start collapsed: the `expanded` default only applies to
    // nodes with known children.
    if (node.children === undefined && this.childrenOf(node).length === 0) {
      return state.get(node) === true;
    }
    return state.has(node) ? state.get(node)! : node.expanded !== false;
  }

  private hasChildren(node: TreeNode): boolean {
    const children = this.childrenOf(node);
    if (node.children !== undefined) return children.length > 0;
    if (this.loadedChildren().has(node)) return children.length > 0;
    return this.loadChildren() !== null;
  }

  private async expand(node: TreeNode): Promise<void> {
    if (this.isExpanded(node)) return;
    this.expansion.update((state) => new Map(state).set(node, true));

    const loader = this.loadChildren();
    if (loader && node.children === undefined && !this.loadedChildren().has(node)) {
      this.loading.update((nodes) => [...nodes, node]);
      this.renderService.scheduleRender();
      try {
        const children = await loader(node);
        this.loadedChildren.update((map) => new Map(map).set(node, children));
      } finally {
        this.loading.update((nodes) => nodes.filter((candidate) => candidate !== node));
      }
    }
    this.renderService.scheduleRender();
  }

  private collapse(node: TreeNode): void {
    if (!this.hasChildren(node)) return;
    this.expansion.update((state) => new Map(state).set(node, false));
    this.renderService.scheduleRender();
  }

  private async toggleExpanded(node: TreeNode): Promise<void> {
    if (this.isExpanded(node)) this.collapse(node);
    else await this.expand(node);
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
        if (find(this.childrenOf(n), target)) {
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
