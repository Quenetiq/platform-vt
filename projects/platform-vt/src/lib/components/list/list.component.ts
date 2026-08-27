import { Component, input, output, signal, inject, effect, afterNextRender, ElementRef, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import type { LayoutNode } from '../../layout/layout-node';
import type { VTNode } from '../../renderer/vt-node';
import { InputService } from '../../services/input.service';
import { FocusService } from '../../services/focus.service';
import { RenderService } from '../../services/render.service';
import { ClickService } from '../../services/click.service';
import { STYLE_READER, type VTStyleReader } from '../../styles/style-registry';
import { vimTranslate } from '../../keymaps/vim.presets';
import type { VTClickEvent } from '../../services/sgr-mouse';

let nextId = 0;

@Component({
  selector: 'vt-list',
  template: '',
})
export class ListComponent {
  private readonly elementRef = inject<ElementRef<HTMLElement & VTNode>>(ElementRef);
  private readonly renderService = inject(RenderService);
  private readonly inputService = inject(InputService);
  private readonly focusService = inject(FocusService);
  private readonly clickService = inject(ClickService);
  private readonly styleReader = inject(STYLE_READER) as VTStyleReader;
  private readonly destroyRef = inject(DestroyRef);

  readonly items = input.required<string[]>();
  readonly selectedIndex = signal(0);
  readonly selectedChange = output<number>();
  readonly activated = output<number>();
  readonly isFocused = signal(false);
  readonly autofocus = input<boolean>(false);
  /** Enable vim-style navigation (`j`/`k` move the selection). */
  readonly vim = input<boolean>(false);

  private readonly id = `vt-list-${String(nextId++)}`;

  constructor() {
    effect(() => {
      const focused = this.focusService.focused();
      this.isFocused.set(focused?.id === this.id);
    });

    effect(() => {
      const node = this.elementRef.nativeElement as VTNode;
      if (node.type !== 'element') return;
      const items = this.items();
      const sel = this.selectedIndex();
      const focused = this.isFocused();
      const lines = items.map((item, i) => {
        const prefix = i === sel ? (focused ? '\u25B6 ' : '\u25B7 ') : '  ';
        const marker = i === sel ? '\u2190' : '';
        return `${prefix}${item} ${marker}`.trimEnd();
      });
      node.styles.set('minHeight', lines.length);
      node.textContent = lines.join('\n');
      const themedColor = this.styleReader.get('vt-list')['color'] ?? '';
      node.styles.set('color', String(themedColor));
      node.dirty = true;
      this.renderService.scheduleRender();
    });

    this.inputService.keyEvents
      .pipe(
        filter(() => this.isFocused()),
        takeUntilDestroyed(),
      )
      .subscribe((event) => {
        this.handleKey(this.vim() ? vimTranslate(event) : event);
      });

    this.focusService.register({
      id: this.id,
      element: this.elementRef.nativeElement,
      priority: 1,
      onFocus: () => { this.renderService.scheduleRender(); },
      onBlur: () => { this.renderService.scheduleRender(); },
    });

    const ref = afterNextRender(() => {
      ref.destroy();
      if (this.autofocus()) this.focusService.focus(this.id);
    });

    this.clickService.register({
      id: this.id,
      element: this.elementRef.nativeElement as HTMLElement,
      onClick: (event: VTClickEvent, node: LayoutNode) => {
        const row = event.y - node.y;
        const items = this.items();
        const index = Math.max(0, Math.min(items.length - 1, row));
        this.selectedIndex.set(index);
        this.selectedChange.emit(index);
        this.activated.emit(index);
        this.focusService.focus(this.id);
      },
    });

    this.destroyRef.onDestroy(() => {
      this.clickService.unregister(this.id);
      this.focusService.unregister(this.id);
    });
  }

  private handleKey(event: { name: string }): void {
    const list = this.items();
    switch (event.name) {
      case 'up':
        this.selectedIndex.update((v) => Math.max(0, v - 1));
        this.selectedChange.emit(this.selectedIndex());
        break;
      case 'down':
        this.selectedIndex.update((v) => Math.min(list.length - 1, v + 1));
        this.selectedChange.emit(this.selectedIndex());
        break;
      case 'return':
        this.activated.emit(this.selectedIndex());
        break;
    }
  }

  focus(): void {
    this.focusService.focus(this.id);
  }
}
