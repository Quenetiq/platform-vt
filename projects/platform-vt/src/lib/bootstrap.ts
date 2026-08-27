import {
  provideZonelessChangeDetection,
  type ApplicationConfig,
  type ApplicationRef,
  type EnvironmentProviders,
  type Provider,
  type Type,
} from '@angular/core';
import { bootstrapApplication, type BootstrapContext } from '@angular/platform-browser';
import { RenderService } from './services/render.service';
import { TerminalService } from './services/terminal.service';
import { InputService } from './services/input.service';
import { FocusService } from './services/focus.service';
import { provideClickService } from './services/click.service';
import { provideKeymapService } from './services/keymap.service';
import { provideClipboardService } from './services/clipboard.service';
import { provideWheelService } from './services/wheel.service';
import { provideSelectionService } from './services/selection.service';
import { provideDragService } from './services/drag.service';
import { provideCommandPalette } from './services/command-palette.service';

export interface TerminalBootstrapOptions extends ApplicationConfig {
  /**
   * Change the terminal's default background color to this color name
   * (e.g. `'black'`), emitted as an OSC 11 sequence. Paints the entire
   * terminal window, not just the rendered area.
   */
  terminalBackground?: string;

  /**
   * Change the terminal's default foreground color (OSC 10).
   */
  terminalForeground?: string;

  /**
   * Run the app in the alternative screen buffer (`\x1b[?1049h`). The normal
   * screen and its scrollback are preserved, and the app's screen is
   * discarded when the app exits. Recommended for fullscreen TUIs.
   */
  useAltScreen?: boolean;

  /**
   * Enable bracketed paste mode (`\x1b[?2004h`): pasted text arrives wrapped
   * in `\x1b[200~ ... \x1b[201~` and is exposed as a single `paste` event on
   * {@link InputService} instead of a burst of individual key events.
   * Defaults to `true`.
   */
  bracketedPaste?: boolean;

  /**
   * Exit gracefully (restore the terminal, then `process.exit`) on SIGINT,
   * SIGTERM and SIGQUIT, and on normal process exit. Defaults to `true`.
   */
  gracefulExit?: boolean;
}

/** Standard xterm RGB values for the 16 ANSI color names. */
const COLOR_RGB: Record<string, string> = {
  black: '#000000',
  red: '#cd4949',
  green: '#0dbc79',
  yellow: '#e5e510',
  blue: '#2472c8',
  magenta: '#bc3fbc',
  cyan: '#11a8cd',
  white: '#e5e5e5',
  gray: '#666666',
  grey: '#666666',
  'bright-red': '#f14c4c',
  'bright-green': '#98e024',
  'bright-yellow': '#fdfb38',
  'bright-blue': '#7aa1f1',
  'bright-magenta': '#d95fd3',
  'bright-cyan': '#7adff3',
  'bright-white': '#ffffff',
};

/**
 * Bootstrap an Angular application that renders to the terminal.
 *
 * Sets up the terminal render pipeline (renderer, layout, output), input
 * handling (keyboard, focus, click), and — depending on options — the
 * alternative screen buffer, bracketed paste, and graceful exit handlers
 * that restore the terminal on SIGINT/SIGTERM/exit.
 *
 * @param rootComponent - The standalone root component to render.
 * @param options - Bootstrap options (see {@link TerminalBootstrapOptions}).
 * @param context - Optional bootstrap context.
 *
 * @example
 * ```typescript
 * bootstrapTerminal(App, {
 *   useAltScreen: true,
 *   terminalBackground: 'black',
 * });
 * ```
 */
export function bootstrapTerminal(
  rootComponent: Type<unknown>,
  options?: TerminalBootstrapOptions,
  context?: BootstrapContext,
): Promise<ApplicationRef> {
  // Create host element for the root component (e.g. <app-root>)
  const hostEl = document.createElement('app-root');
  hostEl.id = 'vt-root';
  hostEl.style.display = 'block';
  document.body.appendChild(hostEl);

  const providers: (Provider | EnvironmentProviders)[] = [
    TerminalService,
    RenderService,
    InputService,
    FocusService,
    provideClickService(),
    provideKeymapService(),
    provideClipboardService(),
    provideWheelService(),
    provideSelectionService(),
    provideDragService(),
    provideCommandPalette(),
    provideZonelessChangeDetection(),
    ...(options?.providers ?? []),
  ];

  const config: ApplicationConfig = {
    ...(options ?? {}),
    providers,
  };

  return bootstrapApplication(rootComponent, config, context).then((appRef) => {
    const terminal = appRef.injector.get(TerminalService);

    const bg = options?.terminalBackground;
    if (bg) terminal.write(`\x1b]11;${toHexColor(bg)}\x07`);
    const fg = options?.terminalForeground;
    if (fg) terminal.write(`\x1b]10;${toHexColor(fg)}\x07`);

    if (options?.useAltScreen) terminal.enterAltScreen();
    if (options?.bracketedPaste !== false) terminal.enableBracketedPaste();

    const render = appRef.injector.get(RenderService);
    render.scheduleRender();

    // Re-render (and reposition overlays) when the terminal window resizes.
    terminal.onResize(() => render.scheduleRender());

    if (options?.gracefulExit !== false && typeof process !== 'undefined') {
      registerExitHandlers(terminal);
    }

    return appRef;
  });
}

/**
 * Restore the terminal when the process exits, however it exits.
 *
 * Registers handlers for SIGINT/SIGTERM/SIGQUIT (clean up, then exit) and a
 * plain `exit` hook for normal termination. Idempotent.
 */
function registerExitHandlers(terminal: TerminalService): void {
  let registered = false;
  if (registered) return;
  registered = true;

  const exit = (code: number): never => {
    terminal.cleanup();
    process.exit(code);
  };

  for (const signal of ['SIGINT', 'SIGTERM', 'SIGQUIT'] as const) {
    try {
      process.on(signal, () => exit(0));
    } catch {
      // Signal not supported on this platform.
    }
  }

  try {
    process.on('exit', () => {
      terminal.cleanup();
    });
  } catch {
    // Ignore.
  }
}

/** Map a color name to a `#RRGGBB` hex string (falls back to `#000000`). */
function toHexColor(name: string): string {
  return COLOR_RGB[name.toLowerCase()] ?? '#000000';
}