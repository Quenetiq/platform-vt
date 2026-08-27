import { Component, contentChildren, input, output, signal, inject, effect, afterNextRender, ElementRef, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { InputService } from '../../services/input.service';
import { FocusService } from '../../services/focus.service';
import { RenderService } from '../../services/render.service';
import { ClickService } from '../../services/click.service';
import { STYLE_READER, type VTStyleReader } from '../../styles/style-registry';

let nextId = 0;

/**
 * A single radio option. Usually placed inside a {@link RadioGroupComponent};
 * standalone it behaves like a toggle with `( )`/`(•)` glyphs.
 *
 * @example
 * ```html
 * <vt-radio-group [value]="color()" (valueChange)="color.set($event)">
 *   <vt-radio value="red" label="Red"></vt-radio>
 *   <vt-radio value="green" label="Green"></vt-radio>
 * </vt-radio-group>
 * ```
 */
@Component({
  selector: 'vt-radio',
  template: '',
})
export class RadioComponent {
  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly renderService = inject(RenderService);
  private readonly focusService = inject(FocusService);
  private readonly clickService = inject(ClickService);
  private readonly styleReader = inject(STYLE_READER) as VTStyleReader;
  private readonly destroyRef = inject(DestroyRef);

  /** The value this option represents (emitted by the group on selection). */
  readonly value = input.required<string>();

  /** Display label. */
  readonly label = input<string>('');

  /** Whether this option is selected (bound by the group's value). */
  readonly checked = input<boolean>(false);

  /** Emitted when the user selects this option. */
  readonly checkedChange = output<boolean>();

  /** Whether the user is focused on this option. */
  readonly isFocused = signal(false);

  readonly autofocus = input<boolean>(false);

  private readonly id = `vt-radio-${String(nextId++)}`;

  constructor() {
    effect(() => {
      const focused = this.focusService.focused();
      this.isFocused.set(focused?.id === this.id);
    });

    effect(() => {
      const el = this.elementRef.nativeElement as HTMLElement;
      const glyph = this.checked() ? '\u25CF' : '\u25CB';
      const text = `${glyph} ${this.label()}`;
      el.setAttribute('display', 'block');
      el.setAttribute('flex-shrink', '0');
      el.setAttribute('min-height', '1');
      el.setAttribute('content', text);
      el.textContent = text;
      const themed = this.styleReader.get('vt-radio')['color'] ?? '';
      if (this.isFocused()) {
        el.setAttribute('color', 'cyan');
      } else if (this.checked()) {
        el.setAttribute('color', 'green');
      } else {
        el.setAttribute('color', String(themed));
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
        this.select();
        this.focusService.focus(this.id);
      },
    });

    this.destroyRef.onDestroy(() => {
      this.clickService.unregister(this.id);
      this.focusService.unregister(this.id);
    });
  }

  /** Programmatically select this radio. */
  select(): void {
    if (this.checked()) return;
    this.checkedChange.emit(true);
  }

  focus(): void {
    this.focusService.focus(this.id);
  }
}

/**
 * Groups {@link RadioComponent} options: arrow keys move the selection
 * between options while one of them is focused. The selected value is
 * emitted via `valueChange`; bind it back to each radio's `checked` to
 * highlight the selection.
 *
 * @example
 * ```html
 * <vt-radio-group [value]="size()" (valueChange)="size.set($event)">
 *   <vt-radio [checked]="size() === 's'" value="s" label="Small"></vt-radio>
 *   <vt-radio [checked]="size() === 'm'" value="m" label="Medium"></vt-radio>
 * </vt-radio-group>
 * ```
 */
@Component({
  selector: 'vt-radio-group',
  template: '<ng-content></ng-content>',
})
export class RadioGroupComponent {
  private readonly renderService = inject(RenderService);
  private readonly inputService = inject(InputService);
  private readonly destroyRef = inject(DestroyRef);

  /** The currently selected value (matches a radio's `value`). */
  readonly value = input<string | null>(null);

  readonly valueChange = output<string>();

  /** All nested radios, in DOM order (signal-based content query). */
  private readonly radios = contentChildren(RadioComponent, { descendants: true });

  constructor() {
    effect(() => {
      // Re-arm selection listeners whenever the child set changes.
      for (const radio of this.radios()) {
        this.listenRadio(radio);
      }
    });

    // Arrow keys move focus and selection within the group.
    this.inputService.keyEvents
      .pipe(
        filter(() => this.radios().some((r) => r.isFocused())),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((event) => {
        const radios = this.radios();
        if (radios.length === 0) return;
        const current = radios.findIndex((r) => r.isFocused());
        if (event.name === 'up' || event.name === 'left') {
          const next = current <= 0 ? radios.length - 1 : current - 1;
          radios[next]!.select();
          radios[next]!.focus();
        } else if (event.name === 'down' || event.name === 'right') {
          const next = (current + 1) % radios.length;
          radios[next]!.select();
          radios[next]!.focus();
        }
      });
  }

  private listenRadio(radio: RadioComponent): void {
    if (this.subscribed.has(radio)) return;
    this.subscribed.add(radio);
    radio.checkedChange.subscribe(() => {
      this.valueChange.emit(radio.value());
      this.renderService.scheduleRender();
    });
  }

  private readonly subscribed = new Set<RadioComponent>();
}