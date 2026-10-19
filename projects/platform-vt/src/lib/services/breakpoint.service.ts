import {
  Injectable,
  InjectionToken,
  computed,
  inject,
  makeEnvironmentProviders,
  signal,
  type EnvironmentProviders,
} from '@angular/core';
import { TerminalService } from './terminal.service';

/** Responsive breakpoint names, ordered from narrowest to widest. */
export type Breakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

/** Minimum terminal width (columns) for each breakpoint. */
export interface BreakpointConfig {
  /** Minimum width for `sm`. */
  sm: number;
  /** Minimum width for `md`. */
  md: number;
  /** Minimum width for `lg`. */
  lg: number;
  /** Minimum width for `xl`. */
  xl: number;
}

/** Default terminal breakpoints. */
export const DEFAULT_BREAKPOINTS: BreakpointConfig = {
  sm: 40,
  md: 80,
  lg: 120,
  xl: 160,
};

const ORDER: Breakpoint[] = ['xs', 'sm', 'md', 'lg', 'xl'];

/** Initial breakpoint thresholds. */
export const BREAKPOINT_CONFIG = new InjectionToken<Partial<BreakpointConfig>>('VT_BREAKPOINT_CONFIG', {
  providedIn: 'root',
  factory: (): Partial<BreakpointConfig> => ({}),
});

/**
 * Derives responsive breakpoints from the terminal width.
 *
 * `width`, `breakpoint` and the `is*` signals update automatically when the
 * terminal is resized (they read {@link TerminalService.columns}).
 *
 * @example
 * ```typescript
 * const bp = inject(BreakpointService);
 * const columns = computed(() => (bp.atLeast('md') ? 4 : bp.atLeast('sm') ? 2 : 1));
 * ```
 */
@Injectable()
export class BreakpointService {
  private readonly terminal = inject(TerminalService);

  /** Current terminal width in columns. */
  readonly width = this.terminal.columns;

  /** Configured minimum widths. */
  readonly config = signal<BreakpointConfig>({ ...DEFAULT_BREAKPOINTS, ...inject(BREAKPOINT_CONFIG) });

  /** Current breakpoint name. */
  readonly breakpoint = computed<Breakpoint>(() => {
    const width = this.width();
    const config = this.config();
    if (width >= config.xl) return 'xl';
    if (width >= config.lg) return 'lg';
    if (width >= config.md) return 'md';
    if (width >= config.sm) return 'sm';
    return 'xs';
  });

  /** Whether the terminal is at least `breakpoint` wide. */
  atLeast(breakpoint: Breakpoint): boolean {
    return ORDER.indexOf(this.breakpoint()) >= ORDER.indexOf(breakpoint);
  }

  /** Whether the width falls inside `[min, max]` (inclusive). */
  matches(min: Breakpoint, max: Breakpoint): boolean {
    const index = ORDER.indexOf(this.breakpoint());
    return index >= ORDER.indexOf(min) && index <= ORDER.indexOf(max);
  }

  /** Convenience signal: width is `sm` or wider. */
  readonly isSm = computed(() => this.atLeast('sm'));
  /** Convenience signal: width is `md` or wider. */
  readonly isMd = computed(() => this.atLeast('md'));
  /** Convenience signal: width is `lg` or wider. */
  readonly isLg = computed(() => this.atLeast('lg'));
  /** Convenience signal: width is `xl`. */
  readonly isXl = computed(() => this.atLeast('xl'));

  /** Override the default breakpoint thresholds. */
  configure(config: Partial<BreakpointConfig>): void {
    this.config.update((current) => ({ ...current, ...config }));
  }
}

/**
 * Provide the breakpoint service.
 *
 * @param config - Optional custom thresholds.
 */
export function provideBreakpoints(config?: Partial<BreakpointConfig>): EnvironmentProviders {
  return makeEnvironmentProviders([
    BreakpointService,
    { provide: BREAKPOINT_CONFIG, useValue: config ?? {} },
  ]);
}
