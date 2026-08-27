import { Component, input, output, signal, inject, effect, afterNextRender, ElementRef, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { InputService } from '../../services/input.service';
import { FocusService } from '../../services/focus.service';
import { RenderService } from '../../services/render.service';
import { ClickService } from '../../services/click.service';
import { STYLE_READER, type VTStyleReader } from '../../styles/style-registry';
import { vimTranslate } from '../../keymaps/vim.presets';

let nextId = 0;

/**
 * A tab strip with keyboard and mouse navigation.
 *
 * Renders the tab labels; the active tab is highlighted (cyan + bold). Use
 * the exported `active` signal to switch the content below the strip.
 * Arrow keys cycle tabs while focused; clicking a tab activates it.
 *
 * @example
 * ```html
 * <vt-tabs [tabs]="['Overview', 'Details']" [active]="tab()" (activeChange)="tab.set($event)"></vt-tabs>
 * @if (tab() === 0) { <vt-text content="Overview content"></vt-text> }
 * @if (tab() === 1) { <vt-text content="Details content"></vt-text> }
 * ```
 */
@Component({
  selector: 'vt-tabs',
  template: '',
})
export class TabsComponent {
  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly renderService = inject(RenderService);
  private readonly inputService = inject(InputService);
  private readonly focusService = inject(FocusService);
  private readonly clickService = inject(ClickService);
  private readonly styleReader = inject(STYLE_READER) as VTStyleReader;
  private readonly destroyRef = inject(DestroyRef);

  readonly tabs = input.required<string[]>();
  readonly active = input<number>(0);
  readonly activeChange = output<number>();
  readonly isFocused = signal(false);
  readonly autofocus = input<boolean>(false);
  /** Enable vim-style navigation (`h`/`l` switch tabs). */
  readonly vim = input<boolean>(false);

  private readonly id = `vt-tabs-${String(nextId++)}`;

  constructor() {
    effect(() => {
      const focused = this.focusService.focused();
      this.isFocused.set(focused?.id === this.id);
    });

    effect(() => {
      const el = this.elementRef.nativeElement as HTMLElement;
      const labels = this.tabs();
      const active = this.active();
      const focused = this.isFocused();

      el.setAttribute('display', 'flex');
      el.setAttribute('flex-direction', 'row');
      el.setAttribute('flex-shrink', '0');
      el.setAttribute('min-height', '1');

      while (el.children.length < labels.length) {
        const span = document.createElement('vt-tab');
        span.setAttribute('display', 'block');
        span.setAttribute('flex-shrink', '0');
        el.appendChild(span);
      }
      while (el.children.length > labels.length) {
        el.lastElementChild?.remove();
      }

      const themed = this.styleReader.get('vt-tabs')['color'] ?? '';
      for (let i = 0; i < labels.length; i++) {
        const span = el.children[i] as HTMLElement;
        const label = labels[i] ?? '';
        const text = label + '  ';
        span.textContent = text;
        span.setAttribute('content', text);
        if (i === active) {
          span.setAttribute('color', focused ? 'cyan' : 'bright-white');
          span.setAttribute('font-weight', 'bold');
          span.setAttribute('text-decoration', 'underline');
        } else {
          span.setAttribute('color', String(themed));
          span.removeAttribute('font-weight');
          span.removeAttribute('text-decoration');
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
        const labels = this.tabs();
        const index = this.hitTab(labels, event.x - node.x);
        if (index >= 0) {
          this.activeChange.emit(index);
          this.focusService.focus(this.id);
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
        const labels = this.tabs();
        if (event.name === 'left' || event.name === 'up') {
          this.activeChange.emit(Math.max(0, this.active() - 1));
        } else if (event.name === 'right' || event.name === 'down') {
          this.activeChange.emit(Math.min(labels.length - 1, this.active() + 1));
        } else if (event.name === 'return' || event.name === ' ') {
          this.activeChange.emit(this.active());
        }
      });

    this.destroyRef.onDestroy(() => {
      this.clickService.unregister(this.id);
      this.focusService.unregister(this.id);
    });
  }

  private hitTab(labels: string[], col: number): number {
    let offset = 0;
    for (let i = 0; i < labels.length; i++) {
      const width = (labels[i] ?? '').length + 2;
      if (col >= offset && col < offset + width) return i;
      offset += width;
    }
    return -1;
  }

  focus(): void {
    this.focusService.focus(this.id);
  }
}