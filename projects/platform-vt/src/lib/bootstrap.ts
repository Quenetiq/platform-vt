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

    appRef.injector.get(RenderService).scheduleRender();
    return appRef;
  });
}

/** Map a color name to a `#RRGGBB` hex string (falls back to `#000000`). */
function toHexColor(name: string): string {
  return COLOR_RGB[name.toLowerCase()] ?? '#000000';
}
