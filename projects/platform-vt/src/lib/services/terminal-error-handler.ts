import { ErrorHandler, Injectable, inject, makeEnvironmentProviders, type EnvironmentProviders } from '@angular/core';
import { RenderService } from './render.service';
import { TerminalService } from './terminal.service';

/**
 * Shows a framed error screen instead of letting unhandled exceptions break
 * the terminal output.
 *
 * On the first unhandled error the handler renders a red-bordered panel
 * over the application with the error message (and the last layout frame is
 * preserved below it). Errors are also logged to stderr. Replace the default
 * `ErrorHandler` with {@link provideTerminalErrorHandler}.
 *
 * @example
 * ```typescript
 * bootstrapTerminal(App, {
 *   providers: [provideTerminalErrorHandler()],
 * });
 * ```
 */
@Injectable()
export class TerminalErrorHandler extends ErrorHandler {
  private readonly terminal = inject(TerminalService);
  private readonly renderService = inject(RenderService);

  private shown = false;

  override handleError(error: unknown): void {
    // Keep default logging to stderr.
    super.handleError(error);

    const message = error instanceof Error ? error.message : String(error);
    const stack =
      error instanceof Error && error.stack ? error.stack.split('\n').slice(1, 4).join('\n') : '';
    this.showErrorScreen(message, stack);
  }

  private showErrorScreen(message: string, stack: string): void {
    if (this.shown) return;
    this.shown = true;

    const rootEl = document.getElementById('vt-root');
    if (!rootEl) return;

    const overlay = document.createElement('vt-error-overlay');
    overlay.setAttribute('display', 'flex');
    overlay.setAttribute('flex-direction', 'column');
    overlay.setAttribute('flex-shrink', '0');
    overlay.setAttribute('border', 'double');
    overlay.setAttribute('border-left', 'thick');
    overlay.setAttribute('padding', '1');
    overlay.setAttribute('color', 'red');
    overlay.setAttribute('background-color', 'black');
    const header = '\u2717 Unhandled error';
    const text = stack.length > 0 ? `${header}\n${message}\n${stack}` : `${header}\n${message}`;
    overlay.setAttribute('content', text);
    overlay.textContent = text;

    rootEl.appendChild(overlay);

    // Write a hint to the real terminal outside the cell grid.
    this.terminal.write(`\r\n\x1b[31mUnhandled error:\x1b[0m ${message}\r\n`);
    try {
      this.renderService.scheduleRender();
    } catch {
      // The render pipeline may itself be broken; the stderr log still helps.
    }
  }
}

/**
 * Provide the terminal error handler (replaces Angular's default).
 */
export function provideTerminalErrorHandler(): EnvironmentProviders {
  return makeEnvironmentProviders([{ provide: ErrorHandler, useClass: TerminalErrorHandler }]);
}