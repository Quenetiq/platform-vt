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
      // White square with rounded corners (▢) vs. white square containing a
      // black small square (▣). The checked glyph is larger and gains a
      // filled centre, so the state change is obvious on any terminal; it is
      // emphasised further with green + bold.
      const check = this.checked() ? '\u25A3' : '\u25A2';
      node.styles.set('minHeight', 1);
      node.textContent = `${check} ${this.label()}`;
      const themedColor = this.styleReader.get('vt-checkbox')['color'] ?? '';
      if (this.isFocused()) {
        node.styles.set('color', 'cyan');
        node.styles.set('fontWeight', 'normal');
      } else if (this.checked()) {
        node.styles.set('color', 'green');
        node.styles.set('fontWeight', 'bold');
      } else {
        node.styles.set('color', String(themedColor));
        node.styles.set('fontWeight', 'normal');
      }
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
