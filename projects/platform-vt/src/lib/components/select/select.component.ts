import { Component, input, output, signal, inject, effect, afterNextRender, ElementRef, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import type { VTNode } from '../../renderer/vt-node';
import { InputService } from '../../services/input.service';
import { FocusService } from '../../services/focus.service';
import { RenderService } from '../../services/render.service';
import { ClickService } from '../../services/click.service';
import { STYLE_READER, type VTStyleReader } from '../../styles/style-registry';

let nextId = 0;

@Component({
  selector: 'vt-select',
  template: '',
})
export class SelectComponent {
  private readonly elementRef = inject<ElementRef<HTMLElement & VTNode>>(ElementRef);
  private readonly renderService = inject(RenderService);
  private readonly inputService = inject(InputService);
  private readonly focusService = inject(FocusService);
  private readonly clickService = inject(ClickService);
  private readonly styleReader = inject(STYLE_READER) as VTStyleReader;
  private readonly destroyRef = inject(DestroyRef);

  readonly options = input.required<string[]>();
  readonly value = signal(0);
  readonly valueChange = output<number>();
  readonly isFocused = signal(false);
  readonly autofocus = input<boolean>(false);

  private readonly id = `vt-select-${String(nextId++)}`;

  constructor() {
    effect(() => {
      const focused = this.focusService.focused();
      this.isFocused.set(focused?.id === this.id);
    });

    effect(() => {
      const node = this.elementRef.nativeElement as VTNode;
      if (node.type !== 'element') return;
      const opts = this.options();
      const sel = this.value();
      const current = opts[sel] ?? '';
      node.styles.set('minHeight', 1);
      node.textContent = `\u25BC ${current}`;
      const themedColor = this.styleReader.get('vt-select')['color'] ?? '';
      node.styles.set('color', this.isFocused() ? 'cyan' : String(themedColor));
      node.dirty = true;
      this.renderService.scheduleRender();
    });

    this.inputService.keyEvents
      .pipe(
        filter(() => this.isFocused()),
        takeUntilDestroyed(),
      )
      .subscribe((event) => {
        this.handleKey(event);
      });

    this.focusService.register({
      id: this.id,
      element: this.elementRef.nativeElement,
      priority: 1,
      onFocus: () => { this.renderService.scheduleRender(); },
      onBlur: () => { this.renderService.scheduleRender(); },
    });

    const ref = afterNextRender(() => {
      ref.destroy();
      if (this.autofocus()) this.focusService.focus(this.id);
    });

    this.clickService.register({
      id: this.id,
      element: this.elementRef.nativeElement as HTMLElement,
      onClick: () => {
        this.focusService.focus(this.id);
      },
    });

    this.destroyRef.onDestroy(() => {
      this.clickService.unregister(this.id);
      this.focusService.unregister(this.id);
    });
  }

  private handleKey(event: { name: string }): void {
    const opts = this.options();
    switch (event.name) {
      case 'up':
        this.value.update((v) => Math.max(0, v - 1));
        this.valueChange.emit(this.value());
        break;
      case 'down':
        this.value.update((v) => Math.min(opts.length - 1, v + 1));
        this.valueChange.emit(this.value());
        break;
      case 'return':
        this.valueChange.emit(this.value());
        break;
    }
  }

  focus(): void {
    this.focusService.focus(this.id);
  }
}
