import { DestroyRef, Injectable, inject, makeEnvironmentProviders, signal, effect, type EnvironmentProviders } from '@angular/core';
import { RenderService } from './render.service';
import { TerminalService } from './terminal.service';

export type ToastVariant = 'info' | 'success' | 'error' | 'warning';

/** A single toast message shown by {@link ToastService}. */
export interface Toast {
  /** Unique id. */
  id: number;
  /** Optional title (bold line above the message). */
  title?: string;
  /** The message text. */
  message: string;
  /** Visual variant: determines the accent color and glyph. */
  variant: ToastVariant;
}

/** Options for {@link ToastService.show}. */
export interface ToastOptions {
  /** Optional title line. */
  title?: string;
  /** Visual variant. Defaults to `'info'`. */
  variant?: ToastVariant;
  /** Auto-dismiss delay in ms. Defaults to 4000. Pass 0 to keep until dismissed. */
  duration?: number;
}

const VARIANT_GLYPH: Record<ToastVariant, string> = {
  info: '\u2139',
  success: '\u2713',
  error: '\u2717',
  warning: '\u26A0',
};

const VARIANT_COLOR: Record<ToastVariant, string> = {
  info: 'cyan',
  success: 'green',
  error: 'red',
  warning: 'yellow',
};

/**
 * Shows transient notification toasts at the top-right of the terminal.
 *
 * Toasts live in their own DOM layer appended to `#vt-root`, so the render
 * service paints them on top of the application (like overlays). Each toast
 * is a bordered box; the newest paints on top. Auto-dismiss is managed by
 * the service. Requires the providers from {@link provideToasts}.
 *
 * @example
 * ```typescript
 * const toasts = inject(ToastService);
 * toasts.show('Saved', { variant: 'success' });
 * toasts.show('Connection lost', { variant: 'error', duration: 0 });
 * ```
 */
@Injectable()
export class ToastService {
  private readonly renderService = inject(RenderService);
  private readonly terminal = inject(TerminalService);
  private readonly destroyRef = inject(DestroyRef);

  /** All currently visible toasts, newest last. */
  readonly toasts = signal<Toast[]>([]);

  private container: HTMLElement | null = null;
  private nextId = 1;

  constructor() {
    effect(() => {
      const container = this.ensureContainer();
      const toasts = this.toasts();
      if (!container) return;

      while (container.children.length < toasts.length) {
        const box = document.createElement('vt-toast');
        box.setAttribute('display', 'flex');
        box.setAttribute('flex-direction', 'column');
        box.setAttribute('flex-shrink', '0');
        box.setAttribute('border', 'single');
        box.setAttribute('padding', '1');
        container.appendChild(box);
      }
      while (container.children.length > toasts.length) {
        container.lastElementChild?.remove();
      }

      for (let i = 0; i < toasts.length; i++) {
        const toast = toasts[i]!;
        const box = container.children[i] as HTMLElement;
        box.setAttribute('background-color', VARIANT_COLOR[toast.variant]);
        const glyph = VARIANT_GLYPH[toast.variant];
        const text = toast.title
          ? `${glyph} ${toast.title}\n${toast.message}`
          : `${glyph} ${toast.message}`;
        box.setAttribute('content', text);
        box.textContent = text;
      }
      this.renderService.scheduleRender();
    });

    this.destroyRef.onDestroy(() => {
      this.container?.remove();
    });
  }

  /** Show a toast. Returns its id (pass to {@link dismiss}). */
  show(message: string, options: ToastOptions = {}): number {
    const id = this.nextId++;
    const toast: Toast = {
      id,
      title: options.title,
      message,
      variant: options.variant ?? 'info',
    };
    this.toasts.update((list) => [...list, toast]);

    const duration = options.duration ?? 4000;
    if (duration > 0) {
      setTimeout(() => this.dismiss(id), duration);
    }
    return id;
  }

  /** Dismiss a toast by id. */
  dismiss(id: number): void {
    this.toasts.update((list) => list.filter((toast) => toast.id !== id));
  }

  /** Dismiss all toasts. */
  dismissAll(): void {
    this.toasts.set([]);
  }

  /** Create (once) the layer that holds the toast boxes. */
  private ensureContainer(): HTMLElement | null {
    if (this.container) return this.container;
    const rootEl = document.getElementById('vt-root');
    if (!rootEl) return null;

    const container = document.createElement('vt-toasts');
    container.setAttribute('display', 'flex');
    container.setAttribute('flex-direction', 'column');
    container.setAttribute('align-items', 'flex-end');
    container.setAttribute('gap', '1');
    container.setAttribute('padding', '1');
    container.setAttribute('width', String(Math.floor(this.terminal.columns() * 0.4)));
    rootEl.appendChild(container);
    this.container = container;

    this.terminal.onResize(() => {
      container.setAttribute('width', String(Math.floor(this.terminal.columns() * 0.4)));
      this.renderService.scheduleRender();
    });
    return container;
  }
}

/**
 * Provide the toast service. The service renders its own layer, so no
 * additional component is needed.
 */
export function provideToasts(): EnvironmentProviders {
  return makeEnvironmentProviders([ToastService]);
}