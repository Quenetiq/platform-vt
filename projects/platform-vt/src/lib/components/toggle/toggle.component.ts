import { Component, input, output, signal, inject, effect, afterNextRender, ElementRef, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { InputService } from '../../services/input.service';
import { FocusService } from '../../services/focus.service';
import { RenderService } from '../../services/render.service';
import { ClickService } from '../../services/click.service';
import { STYLE_READER, type VTStyleReader } from '../../styles/style-registry';

let nextId = 0;

/**
 * A binary on/off switch rendered as `◉ ON` / `○ OFF`.
 *
 * Toggles with Space/Enter while focused or on click.
 *
 * @example
 * ```html
 * <vt-toggle label="Verbose" [checked]="verbose()" (checkedChange)="verbose.set($event)"></vt-toggle>
 * ```
 */
@Component({
  selector: 'vt-toggle',
  template: '',
})
export class ToggleComponent {
  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly renderService = inject(RenderService);
  private readonly focusService = inject(FocusService);
  private readonly clickService = inject(ClickService);
  private readonly styleReader = inject(STYLE_READER) as VTStyleReader;
  private readonly destroyRef = inject(DestroyRef);

  readonly label = input<string>('');
  readonly checked = signal(false);
  readonly checkedChange = output<boolean>();
  readonly isFocused = signal(false);
  readonly autofocus = input<boolean>(false);

  private readonly id = `vt-toggle-${String(nextId++)}`;

  constructor() {
    effect(() => {
      const focused = this.focusService.focused();
      this.isFocused.set(focused?.id === this.id);
    });

    effect(() => {
      const el = this.elementRef.nativeElement as HTMLElement;
      const on = this.checked();
      const glyph = on ? '\u25C9' : '\u25CB';
      const state = on ? 'ON' : 'OFF';
      const text = `${glyph} ${state} ${this.label()}`;
      el.setAttribute('display', 'block');
      el.setAttribute('flex-shrink', '0');
      el.setAttribute('min-height', '1');
      el.setAttribute('content', text);
      el.textContent = text;
      const themed = this.styleReader.get('vt-toggle')['color'] ?? '';
      if (this.isFocused()) {
        el.setAttribute('color', 'cyan');
      } else if (on) {
        el.setAttribute('color', 'green');
        el.setAttribute('font-weight', 'bold');
      } else {
        el.setAttribute('color', String(themed));
        el.removeAttribute('font-weight');
      }
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
      onClick: () => {
        this.toggle();
        this.focusService.focus(this.id);
      },
    });

    this.inputService.keyEvents
      .pipe(
        filter(() => this.isFocused()),
        filter((event) => event.name === 'return' || event.name === ' '),
        takeUntilDestroyed(),
      )
      .subscribe(() => {
        this.toggle();
      });

    this.destroyRef.onDestroy(() => {
      this.clickService.unregister(this.id);
      this.focusService.unregister(this.id);
    });
  }

  private readonly inputService = inject(InputService);

  toggle(): void {
    this.checked.update((v) => !v);
    this.checkedChange.emit(this.checked());
  }

  focus(): void {
    this.focusService.focus(this.id);
  }
}