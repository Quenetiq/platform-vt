import { DestroyRef, Injectable, inject, Injector, signal, effect, type Type, type TemplateRef, type ComponentRef } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { InputService } from '../services/input.service';
import { FocusService } from '../services/focus.service';
import { RenderService } from '../services/render.service';
import { TerminalService } from '../services/terminal.service';
import type { ValidatorFn } from '../forms/validators';
import { OverlayService } from './overlay.service';
import type { OverlayRef } from './overlay-ref';
import { ConfirmDialogComponent, PromptDialogComponent } from './dialog-components';
import { TemplateDialogComponent } from './dialog-frame.component';

/** A handle to an open dialog. */
export class DialogRef<T = unknown, C = unknown> {
  /** Whether the dialog has been closed. */
  readonly closed = signal(false);

  /** The value passed to {@link close}. */
  readonly result = signal<T | null>(null);

  /** The attached component (typed; subscribe to its outputs). */
  readonly component: ComponentRef<C> | null;

  constructor(
    readonly overlay: OverlayRef,
    private readonly renderService: RenderService,
    component: ComponentRef<C> | null = null,
  ) {
    this.component = component;
  }

  /** Close the dialog with an optional result. */
  close(result: T | null = null): void {
    if (this.closed()) return;
    this.result.set(result);
    this.closed.set(true);
    this.overlay.dispose();
    this.renderService.scheduleRender();
  }
}

/** Options for {@link DialogService.open}. */
export interface DialogOptions {
  /** Column of the dialog's top-left corner. Defaults to centering. */
  x?: number;
  /** Row of the dialog's top-left corner. Defaults to centering. */
  y?: number;
  /** Whether Esc closes the dialog. Defaults to `true`. */
  closeOnEscape?: boolean;
  /** Whether Enter activates the primary action (submits the dialog). */
  closeOnEnter?: boolean;
  /** Whether clicking outside the dialog closes it. Defaults to `false`. */
  closeOnOutsideClick?: boolean;
}

/**
 * Opens modal dialogs on top of the application.
 *
 * While a dialog is open, a **focus trap** is active: Tab/Shift+Tab only
 * cycle through the controls inside the dialog, and focus moves to the
 * dialog's first focusable control. `Esc` closes the dialog, `Enter` closes
 * it with a result.
 *
 * Besides the low-level {@link open}, convenience helpers are provided:
 * {@link confirm} (yes/no) and {@link prompt} (text input) both return
 * promises.
 *
 * @example
 * ```typescript
 * const dialogs = inject(DialogService);
 * const ok = await dialogs.confirm({ message: 'Delete this file?' });
 * const name = await dialogs.prompt({ message: 'Project name', placeholder: 'my-app' });
 * ```
 */
@Injectable()
export class DialogService {
  private readonly overlayService = inject(OverlayService);
  private readonly input = inject(InputService);
  private readonly focus = inject(FocusService);
  private readonly renderService = inject(RenderService);
  private readonly terminal = inject(TerminalService);
  private readonly injector = inject(Injector);
  private readonly destroyRef = inject(DestroyRef);

  /** The most recently opened dialog (or null). */
  readonly activeDialog = signal<DialogRef<unknown, unknown> | null>(null);

  constructor() {
    // Clear the active dialog when it closes by any route (Esc, outside
    // click, explicit close), releasing the focus trap.
    effect(() => {
      const ref = this.activeDialog();
      if (ref && (ref.closed() || ref.overlay.disposed())) {
        this.activeDialog.set(null);
        this.focus.setFocusTrap(null);
      }
    });
  }

  /**
   * Open a dialog with the given component and inputs.
   *
   * @param component - The dialog's root component (usually a box with the
   * dialog frame). Inputs set at creation time.
   * @param inputs - Input bindings for the dialog component.
   * @param options - Dialog behavior options.
   * @returns A {@link DialogRef} handle.
   */
  open<C, T = unknown>(
    component: Type<C>,
    inputs?: Record<string, unknown>,
    options: DialogOptions = {},
  ): DialogRef<T, C> {
    const overlay = this.overlayService.create({
      closeOnEscape: options.closeOnEscape ?? true,
      closeOnOutsideClick: options.closeOnOutsideClick ?? false,
    });
    const componentRef = overlay.attach(component, inputs);

    const columns = this.terminal.columns();
    const rows = this.terminal.rows();
    const x = options.x ?? Math.floor(columns / 2);
    const y = options.y ?? Math.floor(rows / 3);
    overlay.setPosition(x, y);

    const ref = new DialogRef<T, C>(overlay, this.renderService, componentRef);
    this.activeDialog.set(ref);

    // Focus trap: while the dialog is open, only its controls are reachable
    // with Tab; focus moves into the dialog on open.
    this.focus.setFocusTrap(overlay.hostElement);
    this.focus.focusIn(overlay.hostElement);

    if (options.closeOnEnter ?? true) {
      this.input.keyEvents
        .pipe(
          filter((event) => event.name === 'return'),
          takeUntilDestroyed(this.destroyRef),
        )
        .subscribe(() => {
          if (this.activeDialog() === ref) {
            ref.close(undefined as T | null);
          }
        });
    }

    this.renderService.scheduleRender();
    return ref;
  }

  /** Close the most recently opened dialog, if any. */
  close(result: unknown = null): void {
    this.activeDialog()?.close(result);
  }

  /**
   * Open a dialog with arbitrary template content inside a framed window.
   *
   * The template renders through the regular terminal pipeline, so any
   * component (boxes, inputs, sliders, buttons) can be laid out inside the
   * window. The template context receives `close` (a function closing the
   * dialog) and `ref` (the {@link DialogRef}).
   *
   * @example
   * ```html
   * <ng-template #settings let-close="close">
   *   <vt-box flexDirection="column" [gap]="1">
   *     <vt-text content="Volume"></vt-text>
   *     <vt-slider [value]="volume()" (valueChange)="volume.set($event)"></vt-slider>
   *     <vt-button label="Done" (clicked)="close()"></vt-button>
   *   </vt-box>
   * </ng-template>
   * ```
   *
   * ```typescript
   * const ref = dialogs.openTemplate({
   *   template: settings,               // <ng-template> reference
   *   title: 'Settings',
   *   width: 40,
   * });
   * ```
   */
  openTemplate(options: {
    template: TemplateRef<unknown>;
    context?: Record<string, unknown>;
    title?: string;
    width?: number | 'auto';
    height?: number | 'auto';
    x?: number;
    y?: number;
    closeOnEscape?: boolean;
    closeOnOutsideClick?: boolean;
  }): DialogRef<unknown> {
    return this.open(
      TemplateDialogComponent,
      {
        template: options.template,
        context: options.context ?? {},
        title: options.title ?? '',
        width: options.width ?? 'auto',
        height: options.height ?? 'auto',
      },
      {
        x: options.x,
        y: options.y,
        closeOnEscape: options.closeOnEscape ?? true,
        closeOnOutsideClick: options.closeOnOutsideClick ?? false,
        closeOnEnter: false,
      },
    );
  }

  /**
   * Open a yes/no confirmation dialog and resolve with the answer.
   *
   * @param options - Message and button labels.
   * @returns A promise resolving to `true` (confirm) or `false` (cancel/Esc).
   *
   * @example
   * ```typescript
   * if (await dialogs.confirm({ message: 'Delete?', confirmLabel: 'Delete' })) {
   *   deleteIt();
   * }
   * ```
   */
  confirm(options: {
    title?: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
  }): Promise<boolean> {
    return new Promise((resolve) => {
      const ref = this.open<ConfirmDialogComponent, boolean>(
        ConfirmDialogComponent,
        {
          title: options.title ?? 'Confirm',
          message: options.message,
          confirmLabel: options.confirmLabel ?? 'OK',
          cancelLabel: options.cancelLabel ?? 'Cancel',
        },
        { closeOnEnter: false },
      );

      ref.component?.instance.confirmed.subscribe((confirmed) => {
        ref.close(confirmed);
        resolve(confirmed);
      });

      // Esc / outside click dispose the overlay without a result: cancel.
      this.onExternalDispose(ref, () => resolve(false));
    });
  }

  /**
   * Open a text prompt dialog and resolve with the entered value.
   *
   * @param options - Message, default value and optional validator.
   * @returns A promise resolving to the value, or `null` when cancelled.
   *
   * @example
   * ```typescript
   * const name = await dialogs.prompt({
   *   message: 'Project name',
   *   defaultValue: 'app',
   *   validator: required('Name is required'),
   * });
   * ```
   */
  prompt(options: {
    title?: string;
    message: string;
    defaultValue?: string;
    placeholder?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    validator?: ValidatorFn;
  }): Promise<string | null> {
    return new Promise((resolve) => {
      const ref = this.open<PromptDialogComponent, string | null>(
        PromptDialogComponent,
        {
          title: options.title ?? 'Prompt',
          message: options.message,
          placeholder: options.placeholder ?? options.defaultValue ?? '',
          confirmLabel: options.confirmLabel ?? 'OK',
          cancelLabel: options.cancelLabel ?? 'Cancel',
          validator: options.validator ?? null,
        },
        { closeOnEnter: false },
      );

      ref.component?.instance.submitted.subscribe((value) => {
        ref.close(value);
        resolve(value);
      });
      ref.component?.instance.cancelled.subscribe(() => {
        ref.close(null);
        resolve(null);
      });

      this.onExternalDispose(ref, () => resolve(null));
    });
  }

  /** Resolve the promise when the overlay is disposed without a result. */
  private onExternalDispose(ref: DialogRef<unknown, unknown>, onDispose: () => void): void {
    toObservable(ref.overlay.disposed, { injector: this.injector })
      .pipe(
        filter((disposed) => disposed && !ref.closed()),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(onDispose);
  }
}