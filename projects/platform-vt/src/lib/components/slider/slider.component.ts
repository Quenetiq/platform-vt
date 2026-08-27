import { Component, input, output, signal, inject, effect, afterNextRender, ElementRef, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { InputService } from '../../services/input.service';
import { FocusService } from '../../services/focus.service';
import { RenderService } from '../../services/render.service';
import { ClickService } from '../../services/click.service';

let nextId = 0;

/**
 * A numeric slider rendered as `──●────` with a draggable knob.
 *
 * Left/right arrows step by `step`; Home/End jump to min/max; clicking on
 * the track positions the knob. The value is emitted via `valueChange`.
 *
 * @example
 * ```html
 * <vt-slider [value]="volume()" (valueChange)="volume.set($event)" [width]="30"></vt-slider>
 * ```
 */
@Component({
  selector: 'vt-slider',
  template: '',
})
export class SliderComponent {
  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly renderService = inject(RenderService);
  private readonly focusService = inject(FocusService);
  private readonly clickService = inject(ClickService);
  private readonly destroyRef = inject(DestroyRef);

  readonly value = input<number>(0);
  readonly min = input<number>(0);
  readonly max = input<number>(100);
  readonly step = input<number>(1);
  readonly width = input<number>(20);
  readonly label = input<string>('');
  readonly autofocus = input<boolean>(false);

  readonly valueChange = output<number>();
  readonly isFocused = signal(false);

  private readonly id = `vt-slider-${String(nextId++)}`;
  private readonly inputService = inject(InputService);

  constructor() {
    effect(() => {
      const focused = this.focusService.focused();
      this.isFocused.set(focused?.id === this.id);
    });

    effect(() => {
      const el = this.elementRef.nativeElement as HTMLElement;
      const min = this.min();
      const max = Math.max(min + 1, this.max());
      const value = Math.min(max, Math.max(min, this.value()));
      const width = Math.max(2, this.width());
      const ratio = (value - min) / (max - min);
      const knob = Math.round(ratio * (width - 1));

      const parts = Array.from({ length: width }, (_, i) => (i === knob ? '\u25CF' : i < knob ? '\u2501' : '\u2500'));
      let text = parts.join('');
      if (this.label().length > 0) text = `${this.label()} ${text} ${value}`;

      el.setAttribute('display', 'block');
      el.setAttribute('flex-shrink', '0');
      el.setAttribute('min-height', '1');
      el.setAttribute('content', text);
      el.textContent = text;
      el.setAttribute('color', this.isFocused() ? 'cyan' : '');
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
        const labelOffset = this.label().length + 1;
        const width = Math.max(2, this.width());
        const ratio = Math.min(1, Math.max(0, (event.x - node.x - labelOffset) / (width - 1)));
        const min = this.min();
        const max = Math.max(min + 1, this.max());
        this.emitValue(min + ratio * (max - min));
        this.focusService.focus(this.id);
      },
    });

    this.inputService.keyEvents
      .pipe(
        filter(() => this.isFocused()),
        takeUntilDestroyed(),
      )
      .subscribe((event) => {
        const step = this.step();
        const min = this.min();
        const max = Math.max(min + 1, this.max());
        switch (event.name) {
          case 'left':
            this.emitValue(this.value() - step);
            break;
          case 'right':
            this.emitValue(this.value() + step);
            break;
          case 'home':
            this.emitValue(min);
            break;
          case 'end':
            this.emitValue(max);
            break;
        }
      });

    this.destroyRef.onDestroy(() => {
      this.clickService.unregister(this.id);
      this.focusService.unregister(this.id);
    });
  }

  private emitValue(v: number): void {
    const min = this.min();
    const max = Math.max(min + 1, this.max());
    const clamped = Math.min(max, Math.max(min, v));
    this.valueChange.emit(clamped);
    this.renderService.scheduleRender();
  }

  focus(): void {
    this.focusService.focus(this.id);
  }
}