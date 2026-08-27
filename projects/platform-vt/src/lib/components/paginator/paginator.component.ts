import { Component, inject, input, output, signal, effect, afterNextRender, ElementRef, DestroyRef } from '@angular/core';
import type { VTNode } from '../../renderer/vt-node';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { InputService } from '../../services/input.service';
import { FocusService } from '../../services/focus.service';
import { RenderService } from '../../services/render.service';

let nextId = 0;

/**
 * A page navigator: `◀ 1 2 3 … 12 ▶`.
 *
 * Renders the current page and total count with prev/next arrows; arrow
 * keys, Home/End and PageUp/PageDown navigate while focused.
 * `pageChange` emits the new 1-based page.
 *
 * @example
 * ```html
 * <vt-paginator [page]="page()" [total]="totalPages()" (pageChange)="page.set($event)"></vt-paginator>
 * ```
 */
@Component({
  selector: 'vt-paginator',
  template: '',
})
export class PaginatorComponent {
  private readonly elementRef = inject(ElementRef);
  private readonly renderService = inject(RenderService);
  private readonly inputService = inject(InputService);
  private readonly focusService = inject(FocusService);
  private readonly destroyRef = inject(DestroyRef);

  readonly page = input<number>(1);
  readonly total = input<number>(1);
  /** Max page-number buttons to render (dots collapse the rest). */
  readonly maxButtons = input<number>(7);
  readonly autofocus = input<boolean>(false);

  readonly pageChange = output<number>();

  readonly isFocused = signal(false);
  private readonly id = `vt-paginator-${String(nextId++)}`;

  constructor() {
    effect(() => {
      const focused = this.focusService.focused();
      this.isFocused.set(focused?.id === this.id);
    });

    effect(() => {
      const el = this.elementRef.nativeElement as HTMLElement;
      const page = Math.min(Math.max(1, this.page()), Math.max(1, this.total()));
      const total = Math.max(1, this.total());

      const pages = this.pageButtons(page, total);
      const text = `\u25C0 ${pages.join(' ')} \u25B6 (${page}/${total})`;
      el.setAttribute('display', 'block');
      el.setAttribute('flex-shrink', '0');
      el.setAttribute('content', text);
      el.textContent = text;
      el.setAttribute('color', this.isFocused() ? 'cyan' : '');
      this.renderService.scheduleRender();
    });

    this.focusService.register({
      id: this.id,
      priority: 1,
      element: this.elementRef.nativeElement as HTMLElement & VTNode,
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

    this.inputService.keyEvents
      .pipe(
        filter(() => this.isFocused()),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((event) => {
        const page = this.page();
        const total = Math.max(1, this.total());
        switch (event.name) {
          case 'left':
            this.emitPage(page - 1);
            break;
          case 'right':
            this.emitPage(page + 1);
            break;
          case 'home':
            this.emitPage(1);
            break;
          case 'end':
            this.emitPage(total);
            break;
          case 'page-up':
            this.emitPage(page - 10);
            break;
          case 'page-down':
            this.emitPage(page + 10);
            break;
        }
      });

    this.destroyRef.onDestroy(() => {
      this.focusService.unregister(this.id);
    });
  }

  /** The page-number buttons, with ellipses for long ranges. */
  private pageButtons(page: number, total: number): string[] {
    if (total <= this.maxButtons()) {
      return Array.from({ length: total }, (_, i) => String(i + 1));
    }
    const max = this.maxButtons();
    const around = Math.floor((max - 3) / 2);
    const from = Math.max(1, Math.min(Math.max(1, page - around), Math.max(1, total - max + 3)));
    const to = Math.min(total, from + max - 3);
    const pages: string[] = [];
    if (from > 1) pages.push('1', '\u2026');
    for (let i = from; i <= to; i++) pages.push(String(i));
    if (to < total) pages.push('\u2026', String(total));
    return pages;
  }

  private emitPage(page: number): void {
    const total = Math.max(1, this.total());
    const clamped = Math.min(total, Math.max(1, page));
    if (clamped !== this.page()) {
      this.pageChange.emit(clamped);
      this.renderService.scheduleRender();
    }
  }
}