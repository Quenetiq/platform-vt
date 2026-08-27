import { DestroyRef, Directive, Injectable, inject, input, output, makeEnvironmentProviders, signal, type EnvironmentProviders, ElementRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type { VTMouseEvent } from './sgr-mouse';
import { MouseService } from './mouse.service';
import { RenderService } from './render.service';

/** Attribute set on draggable host elements for hit-testing. */
const DRAG_ID_ATTR = 'vt-drag-id';

/** Attribute set on drop-zone host elements for hit-testing. */
const DROP_ID_ATTR = 'vt-drop-id';

/** A component that opted into being draggable. */
export interface DraggableElement {
  id: string;
  element: Element;
  /** Called when the drag starts (mouse down on the element). */
  onDragStart?: (event: VTMouseEvent) => void;
  /** Called on every drag move. */
  onDragMove?: (event: VTMouseEvent) => void;
  /** Called when the drag ends; `dropped` is the drop target or null. */
  onDragEnd?: (event: VTMouseEvent, dropped: DropZoneElement | null) => void;
}

/** A component that accepts drops. */
export interface DropZoneElement {
  id: string;
  element: Element;
  onDrop?: (event: VTMouseEvent) => void;
}

/** Event emitted when a drag finishes. */
export interface DragEndEvent {
  /** The pointer position at release. */
  event: VTMouseEvent;
  /** The drop zone under the cursor at release, or null. */
  target: DropZoneElement | null;
}

/**
 * Mouse drag & drop dispatch for terminal UI.
 *
 * Pressing a mouse button on a registered draggable starts a drag; motion
 * updates it, and release ends it — dropping on the topmost registered drop
 * zone under the cursor. This enables reordering lists, moving panels, etc.
 *
 * @example
 * ```typescript
 * const drag = inject(DragService);
 * drag.registerDraggable({ id: 'card-1', element, onDragEnd: (e, target) => { ... } });
 * drag.registerDropZone({ id: 'slot-a', element, onDrop: () => { ... } });
 * ```
 */
@Injectable()
export class DragService {
  private readonly mouse = inject(MouseService);
  private readonly render = inject(RenderService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly draggables = new Map<string, DraggableElement>();
  private readonly dropZones = new Map<string, DropZoneElement>();

  /** Whether a drag is in progress. */
  readonly dragging = signal(false);

  /** The element currently being dragged, or null. */
  readonly activeDrag = signal<DraggableElement | null>(null);

  constructor() {
    this.mouse.mouseEvents
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((event) => {
        if (event.type === 'down' && !this.dragging()) {
          this.startDrag(event);
        } else if (this.dragging()) {
          if (event.type === 'move') {
            this.activeDrag()?.onDragMove?.(event);
          } else if (event.type === 'up') {
            this.endDrag(event);
          }
        }
      });
  }

  registerDraggable(draggable: DraggableElement): void {
    draggable.element.setAttribute(DRAG_ID_ATTR, draggable.id);
    this.draggables.set(draggable.id, draggable);
  }

  unregisterDraggable(id: string): void {
    this.draggables.delete(id);
  }

  registerDropZone(zone: DropZoneElement): void {
    zone.element.setAttribute(DROP_ID_ATTR, zone.id);
    this.dropZones.set(zone.id, zone);
  }

  unregisterDropZone(id: string): void {
    this.dropZones.delete(id);
  }

  private startDrag(event: VTMouseEvent): void {
    const target = this.render.getElementAtPoint(event.x, event.y);
    if (!target) return;

    let el: Element | null = target;
    while (el) {
      const id = el.getAttribute(DRAG_ID_ATTR);
      if (id) {
        const draggable = this.draggables.get(id);
        if (draggable) {
          this.dragging.set(true);
          this.activeDrag.set(draggable);
          draggable.onDragStart?.(event);
          return;
        }
      }
      el = el.parentElement;
    }
  }

  private endDrag(event: VTMouseEvent): void {
    const draggable = this.activeDrag();
    this.dragging.set(false);
    this.activeDrag.set(null);
    if (!draggable) return;

    const zone = this.dropZoneAt(event.x, event.y);
    draggable.onDragEnd?.(event, zone);
    zone?.onDrop?.(event);
  }

  private dropZoneAt(x: number, y: number): DropZoneElement | null {
    const target = this.render.getElementAtPoint(x, y);
    if (!target) return null;
    let el: Element | null = target;
    while (el) {
      const id = el.getAttribute(DROP_ID_ATTR);
      if (id) {
        const zone = this.dropZones.get(id);
        if (zone) return zone;
      }
      el = el.parentElement;
    }
    return null;
  }
}

/**
 * Provide the drag & drop service.
 */
export function provideDragService(): EnvironmentProviders {
  return makeEnvironmentProviders([DragService]);
}

/**
 * Makes a host element draggable; emits drag events as outputs.
 *
 * @example
 * ```html
 * <vt-box [vtDraggable]="true" (dragMove)="onMove($event)" (dragEnd)="onDrop($event)"></vt-box>
 * ```
 */
@Directive({
  selector: '[vtDraggable]',
})
export class DraggableDirective {
  private readonly elementRef = inject<ElementRef<Element>>(ElementRef);
  private readonly dragService = inject(DragService);
  private readonly destroyRef = inject(DestroyRef);

  readonly vtDraggable = input<boolean>(true);

  /** Emitted on every drag move. */
  readonly dragMove = output<VTMouseEvent>();

  /** Emitted when the drag ends (with the drop target). */
  readonly dragEnd = output<DragEndEvent>();

  private readonly id = `vt-draggable-${String(dragDirectiveId++)}`;

  constructor() {
    this.dragService.registerDraggable({
      id: this.id,
      element: this.elementRef.nativeElement,
      onDragMove: (event) => this.dragMove.emit(event),
      onDragEnd: (event, target) => this.dragEnd.emit({ event, target }),
    });
    this.destroyRef.onDestroy(() => this.dragService.unregisterDraggable(this.id));
  }
}

/**
 * Marks a host element as a drop target for {@link DraggableDirective};
 * emits the drop event as an output.
 *
 * @example
 * ```html
 * <vt-box [vtDropZone]="true" (dropped)="onDropHere($event)"></vt-box>
 * ```
 */
@Directive({
  selector: '[vtDropZone]',
})
export class DropZoneDirective {
  private readonly elementRef = inject<ElementRef<Element>>(ElementRef);
  private readonly dragService = inject(DragService);
  private readonly destroyRef = inject(DestroyRef);

  readonly vtDropZone = input<boolean>(true);

  /** Emitted when a draggable is released over this zone. */
  readonly dropped = output<VTMouseEvent>();

  private readonly id = `vt-drop-${String(dragDirectiveId++)}`;

  constructor() {
    this.dragService.registerDropZone({
      id: this.id,
      element: this.elementRef.nativeElement,
      onDrop: (event) => this.dropped.emit(event),
    });
    this.destroyRef.onDestroy(() => this.dragService.unregisterDropZone(this.id));
  }
}

let dragDirectiveId = 0;