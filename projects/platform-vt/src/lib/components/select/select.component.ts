import {
  Component,
  input,
  output,
  signal,
  computed,
  inject,
  effect,
  afterNextRender,
  ElementRef,
  DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import type { VTNode } from '../../renderer/vt-node';
import { InputService } from '../../services/input.service';
import { FocusService } from '../../services/focus.service';
import { RenderService } from '../../services/render.service';
import { ClickService } from '../../services/click.service';
import { STYLE_READER, type VTStyleReader } from '../../styles/style-registry';
import { createIdGenerator } from '../../cdk/dom';

/** One option in the filtered list. */
interface FilteredOption {
  label: string;
  index: number;
}

/**
 * A single- or multi-select control with optional search/filtering.
 *
 * - **Single select** (default): `up`/`down` change the value, `return`
 *   confirms; `value` holds the selected option index and `valueChange`
 *   emits it.
 * - **Multiple** (`[multiple]="true"`): `space`/`return` toggle the active
 *   option; `selected` holds the indices and `selectionChange` emits them.
 * - **Filtering** (`[filterable]="true"`): typing narrows the options, `↑`/
 *   `↓` move through the matches, `esc` clears the filter.
 * - **Type-ahead** (without filtering): typing jumps to the first option
 *   with the given prefix.
 *
 * @example
 * ```html
 * <vt-select [options]="['Red', 'Green', 'Blue']" [filterable]="true"
 *   (valueChange)="color.set($event)"></vt-select>
 * <vt-select [options]="tags()" [multiple]="true"
 *   (selectionChange)="selected.set($event)"></vt-select>
 * ```
 */
@Component({
  selector: 'vt-select',
  template: '',
})
export class SelectComponent {
  private readonly elementRef = inject<ElementRef<HTMLElement & VTNode>>(ElementRef);
  private readonly renderService = inject(RenderService);
  private readonly inputService = inject(InputService);
  private readonly focusService = inject(FocusService);
  private readonly clickService = inject(ClickService);
  private readonly styleReader = inject(STYLE_READER) as VTStyleReader;
  private readonly destroyRef = inject(DestroyRef);

  readonly options = input.required<string[]>();
  readonly value = signal(0);
  readonly valueChange = output<number>();
  readonly isFocused = signal(false);
  readonly autofocus = input<boolean>(false);

  /** Whether several options can be selected at once. */
  readonly multiple = input<boolean>(false);

  /** Whether typing filters the option list. */
  readonly filterable = input<boolean>(false);

  /** Text shown when nothing is selected (single select always has a value). */
  readonly placeholder = input<string>('Select...');

  /** Selected option indices in multiple mode. */
  readonly selected = signal<number[]>([]);

  /** Emits the selected indices in multiple mode. */
  readonly selectionChange = output<number[]>();

  /** Current filter text (updated while typing in filterable mode). */
  readonly filter = signal('');

  /** Index (into the filtered list) highlighted by the keyboard. */
  readonly activeIndex = signal(0);

  /** Options matching the current filter. */
  readonly filteredOptions = computed<FilteredOption[]>(() => {
    const needle = this.filter().trim().toLowerCase();
    return this.options()
      .map((label, index) => ({ label, index }))
      .filter((option) => needle.length === 0 || option.label.toLowerCase().includes(needle));
  });

  /** Labels of the selected options in multiple mode, in option order. */
  readonly selectedLabels = computed<string[]>(() => {
    const options = this.options();
    return [...this.selected()]
      .sort((a, b) => a - b)
      .map((index) => options[index] ?? '')
      .filter((label) => label.length > 0);
  });

  private readonly id = createIdGenerator('vt-select')();

  /** Type-ahead buffer and its reset timer. */
  private typeAhead = '';
  private typeAheadTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    effect(() => {
      const focused = this.focusService.focused();
      this.isFocused.set(focused?.id === this.id);
    });

    effect(() => {
      const node = this.elementRef.nativeElement as HTMLElement & Partial<VTNode>;
      const opts = this.options();
      const multiple = this.multiple();
      const filterText = this.filter();
      const text = `\u25BC ${this.currentDisplay(opts, multiple, filterText)}`;
      const themedColor = this.styleReader.get('vt-select')['color'] ?? '';
      const color = this.isFocused() ? 'cyan' : String(themedColor);

      if (node.type === 'element' && node.styles) {
        node.styles.set('minHeight', 1);
        node.textContent = text;
        node.styles.set('color', color);
        node.dirty = true;
      } else {
        node.setAttribute('min-height', '1');
        node.setAttribute('content', text);
        node.textContent = text;
        node.setAttribute('color', color);
      }
      this.renderService.scheduleRender();
    });

    this.inputService.keyEvents
      .pipe(
        filter(() => this.isFocused()),
        takeUntilDestroyed(),
      )
      .subscribe((event) => {
        this.handleKey(event);
      });

    this.focusService.register({
      id: this.id,
      element: this.elementRef.nativeElement,
      priority: 1,
      onFocus: () => {
        this.renderService.scheduleRender();
      },
      onBlur: () => {
        this.clearTypeAhead();
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
      onClick: () => {
        this.focusService.focus(this.id);
      },
    });

    this.destroyRef.onDestroy(() => {
      this.clearTypeAhead();
      this.clickService.unregister(this.id);
      this.focusService.unregister(this.id);
    });
  }

  /** Select an option by index (single) or toggle it (multiple). */
  select(index: number): void {
    if (index < 0 || index >= this.options().length) return;
    if (this.multiple()) {
      this.toggle(index);
      return;
    }
    this.value.set(index);
    this.valueChange.emit(index);
    this.renderService.scheduleRender();
  }

  /** Toggle an option in multiple mode. */
  toggle(index: number): void {
    if (index < 0 || index >= this.options().length) return;
    this.selected.update((indices) =>
      indices.includes(index) ? indices.filter((i) => i !== index) : [...indices, index],
    );
    this.selectionChange.emit(this.selected());
    this.renderService.scheduleRender();
  }

  focus(): void {
    this.focusService.focus(this.id);
  }

  private currentDisplay(opts: string[], multiple: boolean, filterText: string): string {
    if (this.filterable() && this.isFocused() && filterText.length > 0) {
      return `${filterText}\u258F`;
    }
    if (multiple) {
      const labels = this.selectedLabels();
      return labels.length > 0 ? labels.join(', ') : this.placeholder();
    }
    const active = this.value();
    return opts[active] ?? this.placeholder();
  }

  private handleKey(event: { name: string; ctrl?: boolean; meta?: boolean }): void {
    const filtered = this.filteredOptions();
    const filtering = this.filter().length > 0;
    const active = filtering
      ? this.activeIndex()
      : Math.max(
          0,
          filtered.findIndex((option) =>
            this.multiple()
              ? option.index === (filtered[this.activeIndex()]?.index ?? -1)
              : option.index === this.value(),
          ),
        );
    const current = filtered[active];

    if (event.name === 'escape') {
      if (this.filter().length > 0) {
        this.filter.set('');
        this.activeIndex.set(0);
        this.renderService.scheduleRender();
      }
      return;
    }

    if (event.name === 'up') {
      this.activeIndex.set(Math.max(0, active - 1));
      this.syncSingleFromFiltered(filtered, this.activeIndex());
      return;
    }
    if (event.name === 'down') {
      this.activeIndex.set(Math.min(Math.max(0, filtered.length - 1), active + 1));
      this.syncSingleFromFiltered(filtered, this.activeIndex());
      return;
    }
    if (event.name === 'home') {
      this.activeIndex.set(0);
      this.syncSingleFromFiltered(filtered, 0);
      return;
    }
    if (event.name === 'end') {
      const last = Math.max(0, filtered.length - 1);
      this.activeIndex.set(last);
      this.syncSingleFromFiltered(filtered, last);
      return;
    }
    if ((event.name === 'return' || event.name === ' ') && current) {
      if (this.multiple()) {
        this.toggle(current.index);
      } else {
        this.value.set(current.index);
        this.valueChange.emit(current.index);
        this.filter.set('');
        this.activeIndex.set(0);
        this.renderService.scheduleRender();
      }
      return;
    }

    if (this.filterable() && !event.ctrl && !event.meta) {
      if (event.name === 'backspace') {
        this.filter.update((text) => text.slice(0, -1));
        this.activeIndex.set(0);
        this.renderService.scheduleRender();
        return;
      }
      if (event.name.length === 1) {
        this.filter.update((text) => text + event.name);
        this.activeIndex.set(0);
        this.renderService.scheduleRender();
        return;
      }
    }

    if (!this.filterable() && !event.ctrl && !event.meta && event.name.length === 1) {
      this.handleTypeAhead(event.name);
    }
  }

  /** In single mode, arrow navigation selects the highlighted option. */
  private syncSingleFromFiltered(filtered: FilteredOption[], active: number): void {
    if (!this.multiple()) {
      const option = filtered[active];
      if (option && option.index !== this.value()) {
        this.value.set(option.index);
        this.valueChange.emit(option.index);
      }
    }
    this.renderService.scheduleRender();
  }

  private handleTypeAhead(char: string): void {
    this.typeAhead += char.toLowerCase();
    if (this.typeAheadTimer) clearTimeout(this.typeAheadTimer);
    this.typeAheadTimer = setTimeout(() => {
      this.typeAhead = '';
      this.typeAheadTimer = null;
    }, 500);

    const index = this.options().findIndex((option) =>
      option.toLowerCase().startsWith(this.typeAhead),
    );
    if (index >= 0) {
      if (this.multiple()) {
        this.activeIndex.set(Math.max(0, this.filteredOptions().findIndex((o) => o.index === index)));
      } else {
        this.value.set(index);
        this.valueChange.emit(index);
      }
      this.renderService.scheduleRender();
    }
  }

  private clearTypeAhead(): void {
    this.typeAhead = '';
    if (this.typeAheadTimer) {
      clearTimeout(this.typeAheadTimer);
      this.typeAheadTimer = null;
    }
  }
}
