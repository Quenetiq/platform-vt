import { Component, computed, contentChildren, inject, input, output, signal, effect, ElementRef } from '@angular/core';
import { RenderService } from '../services/render.service';
import { InputComponent } from '../components/input/input.component';
import { TextAreaComponent } from '../components/textarea/textarea.component';
import { SelectComponent } from '../components/select/select.component';
import type { ValidatorFn } from './validators';
import { STYLE_READER, type VTStyleReader } from '../styles/style-registry';

/** Any of the control components a form field can wrap. */
export type FormControl = InputComponent | TextAreaComponent | SelectComponent;

/**
 * Wraps a single form control (`vt-input`, `vt-textarea` or `vt-select`) with
 * a label and validation.
 *
 * Validators run on every value change; the first failing one becomes the
 * displayed error line (red, below the control). `touched` flips to `true`
 * after the control's first value change, so errors are not shown for
 * pristine fields. Form errors are cleared when the value becomes valid.
 *
 * @example
 * ```html
 * <vt-form-field name="email" label="Email" [validators]="[required(), email()]">
 *   <vt-input placeholder="you@example.com" (valueChange)="email.set($event)"></vt-input>
 * </vt-form-field>
 * ```
 */
@Component({
  selector: 'vt-form-field',
  template: '<ng-content></ng-content>',
})
export class FormFieldComponent {
  private readonly elementRef = inject(ElementRef);
  private readonly renderService = inject(RenderService);
  private readonly styleReader = inject(STYLE_READER) as VTStyleReader;

  /** Field name, used in `FormComponent.values()`. */
  readonly name = input.required<string>();

  /** Label shown above the control. */
  readonly label = input<string>('');

  /** Validators applied to the control's current value. */
  readonly validators = input<ValidatorFn[]>([]);

  /** Current error message, or null when the field is valid. */
  readonly error = signal<string | null>(null);

  /** Whether the field has been edited at least once. */
  readonly touched = signal(false);

  /** Whether the field currently fails validation. */
  readonly invalid = computed(() => this.error() !== null);

  /** The current value of the nested control ('' when none). */
  readonly value = signal('');

  private readonly inputs = contentChildren(InputComponent, { descendants: true });
  private readonly textareas = contentChildren(TextAreaComponent, { descendants: true });
  private readonly selects = contentChildren(SelectComponent, { descendants: true });

  /** The nested control, in DOM order. */
  private readonly controls = computed<FormControl[]>(() => [
    ...this.inputs(),
    ...this.textareas(),
    ...this.selects(),
  ]);

  constructor() {
    effect(() => {
      // Re-arm value listeners whenever the nested control set changes.
      for (const control of this.controls()) {
        this.listenControl(control);
      }
    });

    effect(() => {
      const el = this.elementRef.nativeElement as HTMLElement;
      el.setAttribute('display', 'flex');
      el.setAttribute('flex-direction', 'column');
      el.setAttribute('flex-shrink', '0');

      const label = this.label();
      if (label.length > 0) {
        el.setAttribute('content', label);
        el.textContent = label;
      }

      const error = this.error();
      if (error && this.touched()) {
        el.setAttribute('border-left', 'thick');
        el.setAttribute('color', 'red');
      } else {
        el.removeAttribute('border-left');
        const themed = this.styleReader.get('vt-form-field')['color'] ?? '';
        el.setAttribute('color', String(themed));
      }
      this.renderService.scheduleRender();
    });
  }

  private listenControl(control: FormControl): void {
    if (this.subscribed.has(control)) return;
    this.subscribed.add(control);

    const onValue = (value: unknown): void => {
      const text = typeof value === 'string' ? value : typeof value === 'number' ? String(value) : '';
      this.value.set(text);
      this.touched.set(true);
      this.validate(text);
    };

    if (control instanceof InputComponent || control instanceof TextAreaComponent) {
      control.valueChange.subscribe(onValue);
    } else if (control instanceof SelectComponent) {
      control.valueChange.subscribe((value) => onValue(value));
    }
  }

  private validate(value: string): void {
    for (const validator of this.validators()) {
      const error = validator(value);
      if (error !== null) {
        this.error.set(error);
        this.renderService.scheduleRender();
        return;
      }
    }
    if (this.error() !== null) {
      this.error.set(null);
      this.renderService.scheduleRender();
    }
  }

  /** Mark the field as touched (used by {@link FormComponent.submit}). */
  markTouched(): void {
    this.touched.set(true);
    this.validate(this.value());
  }

  private readonly subscribed = new Set<unknown>();
}

/**
 * Groups {@link FormFieldComponent} fields into a validated form.
 *
 * `valid` is derived from all nested fields; `submit()` validates every
 * field (marking them touched) and emits `submitted` only when all are
 * valid. `values()` returns a record of `name → value`.
 *
 * @example
 * ```html
 * <vt-form #f="vtForm" (submitted)="save(f.values())">
 *   <vt-form-field name="email" [validators]="[required(), email()]">...</vt-form-field>
 *   <vt-button label="Submit" (clicked)="f.submit()"></vt-button>
 * </vt-form>
 * ```
 */
@Component({
  selector: 'vt-form',
  template: '<ng-content></ng-content>',
  exportAs: 'vtForm',
})
export class FormComponent {
  private readonly elementRef = inject(ElementRef);
  private readonly renderService = inject(RenderService);

  private readonly fields = contentChildren(FormFieldComponent, { descendants: true });

  /** Whether every nested field is currently valid. */
  readonly valid = computed(() => this.fields().every((field) => !field.invalid()));

  /** Emitted when `submit()` is called and all fields are valid. */
  readonly submitted = output<Record<string, string>>();

  constructor() {
    effect(() => {
      const el = this.elementRef.nativeElement as HTMLElement;
      el.setAttribute('display', 'flex');
      el.setAttribute('flex-direction', 'column');
      el.setAttribute('gap', '1');
      this.renderService.scheduleRender();
    });
  }

  /** Validate all fields; emits `submitted` with the values when valid. */
  submit(): void {
    const values = this.values();
    for (const field of this.fields()) {
      field.markTouched();
    }
    if (this.valid()) {
      this.submitted.emit(values);
    }
  }

  /** A record of `field name → current value`. */
  values(): Record<string, string> {
    const values: Record<string, string> = {};
    for (const field of this.fields()) {
      values[field.name()] = field.value();
    }
    return values;
  }
}