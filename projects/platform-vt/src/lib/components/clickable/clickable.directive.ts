import { DestroyRef, Directive, ElementRef, inject, output } from '@angular/core';
import { ClickService } from '../../services/click.service';
import type { VTClickEvent } from '../../services/sgr-mouse';

let nextId = 0;

/**
 * Makes any element clickable by the mouse in the terminal.
 *
 * Wraps arbitrary content and emits `clicked` when the terminal user clicks
 * on it. Keyboard remains a fallback: combine with focusable components or a
 * separate key handler to keep clickable items usable without a mouse.
 *
 * @example
 * ```html
 * <vt-box vt-clickable (clicked)="onItemClicked()">Item</vt-box>
 * ```
 */
@Directive({
  selector: '[vt-clickable]',
})
export class ClickableDirective {
  private readonly elementRef = inject(ElementRef);
  private readonly clickService = inject(ClickService);
  private readonly destroyRef = inject(DestroyRef);

  /** Emitted when the element is clicked in the terminal. */
  readonly clicked = output<VTClickEvent>();

  private readonly id = `vt-clickable-${String(nextId++)}`;

  constructor() {
    const element = this.elementRef.nativeElement as HTMLElement;
    this.clickService.register({
      id: this.id,
      element,
      onClick: (event: VTClickEvent) => {
        this.clicked.emit(event);
      },
    });

    this.destroyRef.onDestroy(() => {
      this.clickService.unregister(this.id);
    });
  }
}
