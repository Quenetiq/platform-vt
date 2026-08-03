import { Component, input, output, signal, inject, effect, afterNextRender, ElementRef, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import type { VTNode } from '../../renderer/vt-node';
import { InputService, type VTKeyEvent } from '../../services/input.service';
import { FocusService } from '../../services/focus.service';
import { RenderService } from '../../services/render.service';
import { ClickService } from '../../services/click.service';
import { STYLE_READER, type VTStyleReader } from '../../styles/style-registry';

let nextId = 0;

@Component({
  selector: 'vt-checkbox',
  template: '',
})
export class CheckboxComponent {
  private readonly elementRef = inject(ElementRef);
  private readonly renderService = inject(RenderService);
  private readonly inputService = inject(InputService);
  private readonly focusService = inject(FocusService);
  private readonly clickService = inject(ClickService);
  private readonly styleReader = inject(STYLE_READER) as VTStyleReader;
  private readonly destroyRef = inject(DestroyRef);

  readonly label = input<string>('');
  readonly checked = signal(false);
  readonly checkedChange = output<boolean>();
  readonly isFocused = signal(false);
  readonly autofocus = input<boolean>(false);

  private readonly id = `vt-checkbox-${String(nextId++)}`;

  constructor() {
    effect(() => {
      const focused = this.focusService.focused();
      this.isFocused.set(focused?.id === this.id);
    });

    effect(() => {
      const node = this.elementRef.nativeElement as VTNode;
      if (node.type !== 'element') return;
      const check = this.checked() ? '\u2611' : '\u2610';
      node.styles.set('minHeight', 1);
      node.textContent = `${check} ${this.label()}`;
      const themedColor = this.styleReader.get('vt-checkbox')['color'] ?? '';
      node.styles.set('color', this.isFocused() ? 'cyan' : String(themedColor));
      node.dirty = true;
      this.renderService.scheduleRender();
    });

    this.focusService.register({
      id: this.id,
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
      onClick: () => {
        this.toggle();
        this.focusService.focus(this.id);
      },
    });

    this.destroyRef.onDestroy(() => {
      this.clickService.unregister(this.id);
      this.focusService.unregister(this.id);
    });

    this.inputService.keyEvents
      .pipe(
        filter(() => this.isFocused()),
        filter(
          (event): event is VTKeyEvent =>
            event.name === 'return' || event.name === ' ',
        ),
        takeUntilDestroyed(),
      )
      .subscribe(() => {
        this.toggle();
      });
  }

  toggle(): void {
    this.checked.update((v) => !v);
    this.checkedChange.emit(this.checked());
  }

  focus(): void {
    this.focusService.focus(this.id);
  }
}
