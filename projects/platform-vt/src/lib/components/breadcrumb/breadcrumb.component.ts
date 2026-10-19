import { Component, DestroyRef, ElementRef, effect, inject, input, output } from '@angular/core';
import { RenderService } from '../../services/render.service';
import { ClickService } from '../../services/click.service';
import { FocusService } from '../../services/focus.service';
import { createIdGenerator } from '../../cdk/dom';

/**
 * A single-line breadcrumb trail with clickable segments.
 *
 * The last segment is highlighted as the current location. Clicking a segment
 * emits its index through `itemClick`; the parent can then navigate.
 *
 * @example
 * ```html
 * <vt-breadcrumb [items]="['Home', 'Projects', 'platform-vt']"
 *   (itemClick)="navigate($event)"></vt-breadcrumb>
 * ```
 */
@Component({
  selector: 'vt-breadcrumb',
  template: '',
})
export class BreadcrumbComponent {
  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly renderService = inject(RenderService);
  private readonly clickService = inject(ClickService);
  private readonly focusService = inject(FocusService);
  private readonly destroyRef = inject(DestroyRef);

  /** Segments, from root to current location. */
  readonly items = input<string[]>([]);
  /** Separator between segments. */
  readonly separator = input<string>('\u203A');
  /** Color of non-active segments. */
  readonly color = input<string>('gray');
  /** Color of the current (last) segment. */
  readonly activeColor = input<string>('bright-white');

  /** Emits the clicked segment index. */
  readonly itemClick = output<number>();

  private readonly id = createIdGenerator('vt-breadcrumb')();

  constructor() {
    effect(() => {
      const el = this.elementRef.nativeElement;
      const items = this.items();
      const separator = this.separator();

      el.setAttribute('display', 'flex');
      el.setAttribute('flex-direction', 'row');
      el.setAttribute('flex-shrink', '0');
      el.setAttribute('min-height', '1');
      el.replaceChildren();

      for (let i = 0; i < items.length; i++) {
        if (i > 0) {
          const sep = document.createElement('vt-breadcrumb-separator');
          sep.setAttribute('display', 'flex');
          sep.setAttribute('flex-shrink', '0');
          sep.setAttribute('min-height', '1');
          sep.setAttribute('color', this.color());
          const text = ` ${separator} `;
          sep.setAttribute('content', text);
          sep.textContent = text;
          el.appendChild(sep);
        }

        const item = document.createElement('vt-breadcrumb-item');
        item.setAttribute('display', 'flex');
        item.setAttribute('flex-shrink', '0');
        item.setAttribute('min-height', '1');
        item.setAttribute('color', i === items.length - 1 ? this.activeColor() : this.color());
        if (i === items.length - 1) item.setAttribute('font-weight', 'bold');
        item.setAttribute('content', items[i]!);
        item.textContent = items[i]!;
        el.appendChild(item);
      }

      this.renderService.scheduleRender();
    });

    this.focusService.register({
      id: this.id,
      element: this.elementRef.nativeElement,
      priority: 1,
      onFocus: () => this.renderService.scheduleRender(),
      onBlur: () => this.renderService.scheduleRender(),
    });

    this.clickService.register({
      id: this.id,
      element: this.elementRef.nativeElement,
      onClick: (event, node) => {
        const x = event.x - node.x;
        const separatorWidth = this.separator().length + 2;
        let offset = 0;
        const items = this.items();
        for (let i = 0; i < items.length; i++) {
          const width = items[i]!.length;
          if (x >= offset && x < offset + width) {
            this.select(i);
            return;
          }
          offset += width + separatorWidth;
        }
      },
    });

    this.destroyRef.onDestroy(() => {
      this.clickService.unregister(this.id);
      this.focusService.unregister(this.id);
    });
  }

  /** Emit the click for a segment (also used by the mouse handler). */
  select(index: number): void {
    if (index >= 0 && index < this.items().length) {
      this.itemClick.emit(index);
    }
  }

  /** Give the breadcrumb focus (keyboard users can Tab to it). */
  focus(): void {
    this.focusService.focus(this.id);
  }
}
