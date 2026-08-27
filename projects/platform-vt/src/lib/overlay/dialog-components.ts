import { Component, inject, input, output, signal, effect } from '@angular/core';
import { RenderService } from '../services/render.service';
import { BoxComponent } from '../components/box/box.component';
import { ButtonComponent } from '../components/button/button.component';
import { TextComponent } from '../components/text/text.component';
import { InputComponent } from '../components/input/input.component';
import type { ValidatorFn } from '../forms/validators';

/**
 * A modal confirmation dialog (used by `DialogService.confirm`).
 *
 * Renders the message with OK/Cancel buttons; Enter confirms (via the
 * autofocused button), Esc cancels. Emits the outcome on {@link confirmed}.
 */
@Component({
  selector: 'vt-confirm-dialog',
  imports: [BoxComponent, TextComponent, ButtonComponent],
  template: `
    <vt-box flexDirection="column" [gap]="1" [padding]="1" border="round">
      <vt-text [content]="title()" fontWeight="bold" color="cyan"></vt-text>
      <vt-text [content]="message()"></vt-text>
      <vt-box flexDirection="row" [gap]="1" [flexGrow]="1">
        <vt-button [label]="confirmLabel()" variant="primary" [autofocus]="true" (clicked)="confirm()"></vt-button>
        <vt-button [label]="cancelLabel()" (clicked)="cancel()"></vt-button>
      </vt-box>
    </vt-box>
  `,
})
export class ConfirmDialogComponent {
  readonly title = input('Confirm');
  readonly message = input.required<string>();
  readonly confirmLabel = input('OK');
  readonly cancelLabel = input('Cancel');

  /** Emits `true` on confirm, `false` on cancel. */
  readonly confirmed = output<boolean>();

  confirm(): void {
    this.confirmed.emit(true);
  }

  cancel(): void {
    this.confirmed.emit(false);
  }
}

/**
 * A modal prompt dialog (used by `DialogService.prompt`).
 *
 * Renders the message with a text input and OK/Cancel; Enter submits
 * (validating when a validator is provided), Esc cancels. Emits the value
 * on {@link submitted} or {@link cancelled}.
 */
@Component({
  selector: 'vt-prompt-dialog',
  imports: [BoxComponent, TextComponent, InputComponent, ButtonComponent],
  template: `
    <vt-box flexDirection="column" [gap]="1" [padding]="1" border="round">
      <vt-text [content]="title()" fontWeight="bold" color="cyan"></vt-text>
      <vt-text [content]="message()"></vt-text>
      <vt-input [placeholder]="placeholder()" [autofocus]="true" (valueChange)="value.set($event)" (submitted)="submit()"></vt-input>
      @if (error()) {
        <vt-text [content]="error() ?? ''" color="red"></vt-text>
      }
      <vt-box flexDirection="row" [gap]="1" [flexGrow]="1">
        <vt-button [label]="confirmLabel()" variant="primary" (clicked)="submit()"></vt-button>
        <vt-button [label]="cancelLabel()" (clicked)="cancel()"></vt-button>
      </vt-box>
    </vt-box>
  `,
})
export class PromptDialogComponent {
  readonly title = input('Prompt');
  readonly message = input.required<string>();
  readonly placeholder = input('');
  readonly confirmLabel = input('OK');
  readonly cancelLabel = input('Cancel');
  readonly validator = input<ValidatorFn | null>(null);

  /** Emits the entered value when submitted. */
  readonly submitted = output<string>();
  /** Emits when cancelled. */
  readonly cancelled = output<void>();

  readonly value = signal('');
  readonly error = signal<string | null>(null);

  private readonly renderService = inject(RenderService);

  constructor() {
    effect(() => {
      this.renderService.scheduleRender();
    });
  }

  submit(): void {
    const validator = this.validator();
    if (validator) {
      const error = validator(this.value());
      if (error !== null) {
        this.error.set(error);
        return;
      }
    }
    this.error.set(null);
    this.submitted.emit(this.value());
  }

  cancel(): void {
    this.cancelled.emit();
  }
}