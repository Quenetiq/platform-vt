import {
  Injectable,
  computed,
  inject,
  makeEnvironmentProviders,
  signal,
  type EnvironmentProviders,
} from '@angular/core';
import { osc } from '../output/ansi';
import { InputService } from './input.service';
import { TerminalService } from './terminal.service';

/** Light or dark terminal color scheme. */
export type ColorScheme = 'dark' | 'light';

/** Semantic colors for a {@link ColorScheme}. */
export interface ThemeColors {
  /** Terminal background. */
  background: string;
  /** Primary text color. */
  foreground: string;
  /** Secondary/dim text. */
  muted: string;
  /** Accent color for focus, links and selection. */
  accent: string;
  /** Borders and separators. */
  border: string;
  /** Success/positive state. */
  success: string;
  /** Warning state. */
  warning: string;
  /** Error/destructive state. */
  error: string;
  /** Informational state. */
  info: string;
}

/** Default dark palette. */
export const DARK_THEME: ThemeColors = {
  background: '#1e1e1e',
  foreground: '#d4d4d4',
  muted: '#808080',
  accent: '#11a8cd',
  border: '#666666',
  success: '#0dbc79',
  warning: '#e5e510',
  error: '#cd4949',
  info: '#2472c8',
};

/** Default light palette. */
export const LIGHT_THEME: ThemeColors = {
  background: '#f5f5f5',
  foreground: '#1e1e1e',
  muted: '#767676',
  accent: '#0067b8',
  border: '#b0b0b0',
  success: '#107c10',
  warning: '#9a6700',
  error: '#c42b1c',
  info: '#005a9e',
};

/** Result of a terminal color query. */
export interface ThemeQueryResult {
  /** Default foreground color as `#rrggbb`, or null when unknown. */
  foreground: string | null;
  /** Default background color as `#rrggbb`, or null when unknown. */
  background: string | null;
}

const OSC_COLOR_RE =
  /\x1b\](1[01]);rgb:([0-9a-fA-F]{1,4})\/([0-9a-fA-F]{1,4})\/([0-9a-fA-F]{1,4})(?:\x07|\x1b\\)/g;

/**
 * Parse a terminal color report (OSC 10/11) into a `#rrggbb` string.
 *
 * Terminals answer color queries with X11 color specifications, e.g.
 * `ESC ]11;rgb:1e1e/1e1e/1e1e BEL`. Components may be 1-4 hex digits.
 *
 * @param data - A stdin chunk that may contain color reports.
 * @param code - `10` for foreground, `11` for background (default: any).
 * @returns The last reported color, or null when the chunk contains none.
 */
export function parseOscColor(data: string, code?: 10 | 11): string | null {
  OSC_COLOR_RE.lastIndex = 0;
  let result: string | null = null;
  let match: RegExpExecArray | null;
  while ((match = OSC_COLOR_RE.exec(data)) !== null) {
    if (code !== undefined && Number(match[1]) !== code) continue;
    const r = componentToByte(match[2]!);
    const g = componentToByte(match[3]!);
    const b = componentToByte(match[4]!);
    result = `#${hex2(r)}${hex2(g)}${hex2(b)}`;
  }
  return result;
}

/** Detect the color scheme from environment variables. */
export function detectColorScheme(env: Record<string, string | undefined> = envVars()): ColorScheme {
  const explicit = (env['TERM_BACKGROUND'] ?? '').toLowerCase();
  if (explicit === 'light' || explicit === 'dark') return explicit;

  // COLORFGBG is "fg;bg" (sometimes "fg;default;bg"); the last value is the
  // background index. 0-6 and 8 are dark; 7 and 9-15 are light.
  const colorFgBg = env['COLORFGBG'];
  if (colorFgBg) {
    const parts = colorFgBg.split(';');
    const background = Number(parts[parts.length - 1]);
    if (Number.isFinite(background)) {
      return background === 7 || background >= 9 ? 'light' : 'dark';
    }
  }
  return 'dark';
}

/** Pick a color scheme from a `#rrggbb` background using perceived luminance. */
export function colorSchemeForBackground(hex: string): ColorScheme {
  const value = hex.replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(value)) return 'dark';
  const r = Number.parseInt(value.slice(0, 2), 16) / 255;
  const g = Number.parseInt(value.slice(2, 4), 16) / 255;
  const b = Number.parseInt(value.slice(4, 6), 16) / 255;
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 0.5 ? 'light' : 'dark';
}

/**
 * Detects the terminal's light/dark color scheme and semantic palette.
 *
 * The scheme is initialized from `TERM_BACKGROUND` / `COLORFGBG` and can be
 * refined by asking the terminal for its default background color (OSC 11).
 * Terminals that do not answer the query keep the environment-based guess.
 *
 * The service is signal-backed: `scheme()` and `colors()` update
 * automatically, so components can read them inside render effects.
 *
 * @example
 * ```typescript
 * const theme = inject(ThemeService);
 * theme.query();                    // ask the terminal (OSC 10/11)
 * theme.toggle();                   // flip dark <-> light
 * el.setAttribute('color', theme.colors().foreground);
 * ```
 */
@Injectable()
export class ThemeService {
  private readonly input = inject(InputService);
  private readonly terminal = inject(TerminalService);

  /** Current color scheme. */
  readonly scheme = signal<ColorScheme>(detectColorScheme());

  /** Foreground reported by the terminal, or null when unknown. */
  readonly reportedForeground = signal<string | null>(null);

  /** Background reported by the terminal, or null when unknown. */
  readonly reportedBackground = signal<string | null>(null);

  /** Semantic palette for the current scheme. */
  readonly colors = computed<ThemeColors>(() =>
    this.scheme() === 'light' ? LIGHT_THEME : DARK_THEME,
  );

  /** Switch between dark and light schemes. */
  toggle(): void {
    this.scheme.update((scheme) => (scheme === 'dark' ? 'light' : 'dark'));
  }

  /** Explicitly set the scheme (e.g. from an app setting). */
  setScheme(scheme: ColorScheme): void {
    this.scheme.set(scheme);
  }

  /**
   * Query the terminal's default foreground and background colors.
   *
   * Emits OSC 10/11 queries and resolves with the terminal's reply. Terminals
   * that do not support the query resolve with nulls after `timeoutMs`.
   *
   * @param timeoutMs - How long to wait for a reply (default 250ms).
   */
  query(timeoutMs = 250): Promise<ThemeQueryResult> {
    return new Promise((resolve) => {
      const result: ThemeQueryResult = { foreground: null, background: null };
      let finished = false;

      const finish = (): void => {
        if (finished) return;
        finished = true;
        clearTimeout(timer);
        subscription.unsubscribe();
        resolve(result);
      };

      const subscription = this.input.rawInput.subscribe((chunk) => {
        const foreground = parseOscColor(chunk, 10);
        const background = parseOscColor(chunk, 11);
        if (foreground) {
          result.foreground = foreground;
          this.reportedForeground.set(foreground);
        }
        if (background) {
          result.background = background;
          this.reportedBackground.set(background);
          this.scheme.set(colorSchemeForBackground(background));
        }
        if (result.foreground && result.background) finish();
      });

      const timer = setTimeout(finish, Math.max(0, timeoutMs));
      this.terminal.write(osc.queryForeground() + osc.queryBackground());
    });
  }
}

/**
 * Provide the theme service.
 *
 * Requires {@link InputService} and {@link TerminalService} to be provided
 * (both are set up by `bootstrapTerminal`).
 */
export function provideTheme(): EnvironmentProviders {
  return makeEnvironmentProviders([ThemeService]);
}

function envVars(): Record<string, string | undefined> {
  return typeof process !== 'undefined' ? process.env : {};
}

function componentToByte(component: string): number {
  const value = Number.parseInt(component, 16);
  switch (component.length) {
    case 1:
      return value * 17;
    case 2:
      return value;
    case 3:
      return Math.round(value / 0x10);
    default:
      return Math.round(value / 0x101);
  }
}

function hex2(value: number): string {
  return Math.max(0, Math.min(255, value)).toString(16).padStart(2, '0');
}
