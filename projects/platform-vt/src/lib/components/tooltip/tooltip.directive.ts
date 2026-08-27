import {
  DestroyRef,
  Directive,
  ElementRef,
  inject,
  input,
  type ComponentRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { MouseService } from '../../services/mouse.service';
import { RenderService } from '../../services/render.service';
import type { OverlayRef } from '../../overlay/overlay-ref';
import { OverlayService } from '../../overlay/overlay.service';
import type { VTMouseEvent } from '../../services/sgr-mouse';
import { TooltipComponent } from './tooltip.component';

export type TooltipPosition = 'bottom' | 'top' | 'right' | 'left';

/**
 * Shows a tooltip overlay while the terminal cursor hovers the host element.
 *
 * Requires the overlay providers (`provideOverlay()`) to be registered.
 *
 * @example
 * ```html
 * <vt-box vtTooltip="Shows extra info" vtTooltipPosition="top">
 *   Hover me
 * </vt-box>
 * ```
 */
@Directive({ selector: '[vtTooltip]' })
export class TooltipDirective {
  /** The tooltip text (also the selector-triggering attribute). */
  readonly text = input.required<string>({ alias: 'vtTooltip' });
  /** Which side of the host the tooltip appears on. */
  readonly position = input<TooltipPosition>('bottom');
  /** Gap between the host and the tooltip, in rows/columns. */
  readonly offset = input<number>(1);

  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly renderService = inject(RenderService);
  private readonly mouse = inject(MouseService);
  private readonly overlay = inject(OverlayService);
  private readonly destroyRef = inject(DestroyRef);

  private overlayRef: OverlayRef | null = null;
  private componentRef: ComponentRef<TooltipComponent> | null = null;

  constructor() {
    this.mouse.enable();

    this.mouse.mouseEvents
      .pipe(
        filter((event): event is VTMouseEvent => event.type === 'move' || event.type === 'up'),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((event) => {
        const host = this.elementRef.nativeElement;
        const under = this.renderService.getElementAtPoint(event.x, event.y);
        if (under !== null && (under === host || host.contains(under))) {
          this.show();
        } else {
          this.hide();
        }
      });

    this.destroyRef.onDestroy(() => this.hide());
  }

  private show(): void {
    if (this.overlayRef) {
      this.positionOverlay();
      return;
    }

    const overlayRef = this.overlay.create();
    const componentRef = overlayRef.attach(TooltipComponent, { text: this.text() });
    this.overlayRef = overlayRef;
    this.componentRef = componentRef;
    this.positionOverlay();
  }

  private positionOverlay(): void {
    if (!this.overlayRef) return;
    // Lazy rect: the overlay re-resolves the anchor on every render pass, so
    // the tooltip tracks its host on scroll and terminal resize.
    this.overlayRef.setPositionFromRect(
      () => this.renderService.getElementRect(this.elementRef.nativeElement),
      this.position(),
      0,
      this.offset(),
    );
  }

  private hide(): void {
    if (!this.overlayRef) return;
    this.overlayRef.dispose();
    this.overlayRef = null;
    this.componentRef = null;
  }
}