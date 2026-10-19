import { DestroyRef, Directive, ElementRef, inject, output } from '@angular/core';
import { HoverService } from '../../services/hover.service';
import type { VTMouseEvent } from '../../services/sgr-mouse';
import { createIdGenerator } from '../../cdk/dom';

/**
 * Makes any element hover-aware in the terminal.
 *
 * Emits `hovered` when the mouse enters the element (or one of its children)
 * and `unhovered` when it leaves. Hover state is re-evaluated after every
 * render pass, so scrolling content under a stationary cursor stays correct.
 *
 * @example
 * ```html
 * <vt-box vt-hoverable (hovered)="onRowEnter()" (unhovered)="onRowLeave()">
 *   Row content
 * </vt-box>
 * ```
 */
@Directive({
  selector: '[vt-hoverable]',
})
export class HoverableDirective {
  private readonly elementRef = inject(ElementRef);
  private readonly hoverService = inject(HoverService);
  private readonly destroyRef = inject(DestroyRef);

  /** Emitted when the mouse enters the element or one of its children. */
  readonly hovered = output<VTMouseEvent>();

  /** Emitted when the mouse leaves the element. */
  readonly unhovered = output<void>();

  private readonly id = createIdGenerator('vt-hoverable')();

  constructor() {
    this.hoverService.register({
      id: this.id,
      element: this.elementRef.nativeElement as HTMLElement,
      onHoverEnter: (event: VTMouseEvent) => {
        this.hovered.emit(event);
      },
      onHoverLeave: () => {
        this.unhovered.emit();
      },
    });

    this.destroyRef.onDestroy(() => {
      this.hoverService.unregister(this.id);
    });
  }
}
