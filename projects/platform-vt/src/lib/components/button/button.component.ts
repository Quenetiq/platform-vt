import { Component, input, output, signal, inject, effect, afterNextRender, ElementRef, DestroyRef } from '@angular/core';
import { InputService } from '../../services/input.service';
import { FocusService } from '../../services/focus.service';
import { RenderService } from '../../services/render.service';
import { ClickService } from '../../services/click.service';
import { STYLE_READER, type VTStyleReader } from '../../styles/style-registry';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';

let nextId = 0;

@Component({
  selector: 'vt-button',
  template: '',
})
export class ButtonComponent {
  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly focusService = inject(FocusService);
  private readonly inputService = inject(InputService);
  private readonly renderService = inject(RenderService);
  private readonly clickService = inject(ClickService);
  private readonly styleReader = inject(STYLE_READER) as VTStyleReader;
  private readonly destroyRef = inject(DestroyRef);

  readonly label = input<string>('');
  readonly variant = input<'primary' | 'secondary' | 'danger'>('primary');
  readonly autofocus = input<boolean>(false);

  readonly clicked = output<void>();

  private readonly id = `vt-button-${String(nextId++)}`;
  private readonly isFocused = signal(false);

  constructor() {
    const self = this;
    this.focusService.register({
      id: this.id,
      element: this.elementRef.nativeElement,
      priority: 1,
      onFocus: () => {
        self.isFocused.set(true);
        self.renderService.scheduleRender();
      },
      onBlur: () => {
        self.isFocused.set(false);
        self.renderService.scheduleRender();
      },
    });

    this.clickService.register({
      id: this.id,
      element: this.elementRef.nativeElement as HTMLElement,
      onClick: () => {
        this.clicked.emit();
        this.focusService.focusInput();
      },
    });

    const ref = afterNextRender(() => {
      ref.destroy();
      if (this.autofocus()) this.focusService.focus(this.id);
    });

    this.destroyRef.onDestroy(() => {
      this.clickService.unregister(this.id);
      this.focusService.unregister(this.id);
    });

    this.inputService.keyEvents
      .pipe(
        filter(() => this.focusService.focusedId() === this.id),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((event) => {
        if (event.name === 'return' || event.name === ' ') {
          this.clicked.emit();
          this.focusService.focusInput();
        }
      });

    effect(() => {
      const el = this.elementRef.nativeElement as HTMLElement;
      const lbl = this.label();
      el.setAttribute('display', 'block');
      el.setAttribute('content', lbl);
      el.textContent = lbl;
      if (this.isFocused()) {
        el.setAttribute('color', 'white');
        el.setAttribute('background-color', 'cyan');
        el.setAttribute('font-weight', 'bold');
      } else {
        const themed = this.styleReader.get('vt-button');
        el.setAttribute('color', String(themed['color'] ?? 'cyan'));
        el.setAttribute('background-color', String(themed['backgroundColor'] ?? ''));
        el.setAttribute('font-weight', String(themed['fontWeight'] ?? 'normal'));
      }
      el.setAttribute('min-height', '1');
      el.setAttribute('min-width', '1');
      this.renderService.scheduleRender();
    });
  }
}
