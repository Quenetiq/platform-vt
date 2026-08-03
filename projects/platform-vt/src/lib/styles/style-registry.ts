import { Injectable, InjectionToken, inject, signal } from '@angular/core';
import type { VTStyleSheet, VTStyleValue } from './stylesheet';

/**
 * Interface for reading themed styles.
 *
 * Components depend on this abstraction (via {@link STYLE_READER}) instead of
 * the concrete {@link StyleRegistry} implementation, so the style source can be
 * swapped without touching components.
 */
export interface VTStyleReader {
  /** Resolve styles for a component selector (global + tag rules). */
  get(selector: string): Record<string, VTStyleValue>;
  /** Resolve styles for a class name (global + class rules). */
  getClass(className: string): Record<string, VTStyleValue>;
}

/**
 * Injection token for the themed style reader.
 *
 * The default provider wires up the signal-backed {@link StyleRegistry}, so
 * registering styles later (e.g. after an async `stylesUrl` load) retriggers
 * component render effects automatically.
 */
export const STYLE_READER = new InjectionToken<VTStyleReader>(
  'VT_STYLE_READER',
  {
    providedIn: 'root',
    factory: (): StyleRegistry => inject(StyleRegistry),
  },
);

/**
 * Registry of theme styles, keyed by component selector or class name.
 *
 * Resolves the effective styles for a selector by merging the universal
 * selector (`*`) rules with the tag-specific rules (tag rules win), and for
 * a class by merging `*` rules with class rules.
 *
 * The store is signal-backed: components read it inside their render effects,
 * so registering styles later (e.g. after an async `stylesUrl` load) retriggers
 * their effects automatically.
 */
@Injectable({ providedIn: 'root' })
export class StyleRegistry {
  private readonly store = signal<{
    global: Record<string, VTStyleValue>;
    tags: Record<string, Record<string, VTStyleValue>>;
    classes: Record<string, Record<string, VTStyleValue>>;
  }>({ global: {}, tags: {}, classes: {} });

  /** Register (or merge) a parsed stylesheet into this registry. */
  register(sheet: VTStyleSheet): void {
    this.store.update((state) => {
      let global = state.global;
      let tags = state.tags;
      let classes = state.classes;

      for (const rule of sheet.rules) {
        for (const selector of rule.selectors) {
          if (selector === '*') {
            global = { ...global, ...rule.styles };
          } else if (selector.startsWith('.')) {
            const name = selector.slice(1);
            classes = { ...classes, [name]: { ...(classes[name] ?? {}), ...rule.styles } };
          } else {
            tags = { ...tags, [selector]: { ...(tags[selector] ?? {}), ...rule.styles } };
          }
        }
      }

      return { global, tags, classes };
    });
  }

  /**
   * Resolve the effective styles for a component selector.
   *
   * Reading this signal inside a component effect tracks the registry, so the
   * effect re-runs when new styles are registered.
   *
   * @param selector - Component selector, e.g. `vt-text`.
   * @returns Merged styles (global + tag-specific).
   */
  get(selector: string): Record<string, VTStyleValue> {
    const { global, tags } = this.store();
    return { ...global, ...(tags[selector] ?? {}) };
  }

  /**
   * Resolve the effective styles for a class name.
   *
   * @param className - Class name, e.g. `msg`.
   * @returns Merged styles (global + class-specific).
   */
  getClass(className: string): Record<string, VTStyleValue> {
    const { global, classes } = this.store();
    return { ...global, ...(classes[className] ?? {}) };
  }
}

/**
 * Merge theme-provided styles into component input values.
 *
 * Theme styles act as defaults: they apply only to inputs that were left at
 * their default value. Explicitly provided component inputs always win.
 *
 * Class-based rules are more specific than tag rules, so when a class provides
 * a value for an input it wins over the tag-level theme value.
 *
 * @param registry - The style reader (or `null` when theming is unavailable).
 * @param selector - Component selector, e.g. `vt-text`.
 * @param inputs - Map of input name → `{ value, default }`.
 * @param classes - Optional host class names to include in the lookup.
 * @returns Effective values for every input.
 *
 * @example
 * ```typescript
 * const t = mergeTheme(registry, 'vt-text', {
 *   color: { value: this.color(), default: '' },
 *   opacity: { value: this.opacity(), default: 'normal' },
 * });
 * el.setAttribute('color', String(t.color));
 * ```
 */
export function mergeTheme<
  const T extends Record<string, { value: unknown; default: unknown }>,
>(
  registry: VTStyleReader | null | undefined,
  selector: string,
  inputs: T,
  classes?: Iterable<string>,
): { [K in keyof T]: unknown } {
  const themed = registry?.get(selector) ?? {};
  const classStyles: Record<string, VTStyleValue> = {};
  if (registry && classes) {
    for (const className of classes) {
      if (!className) continue;
      Object.assign(classStyles, registry.getClass(className));
    }
  }
  const effective = { ...themed, ...classStyles };
  const out: Record<string, unknown> = {};

  for (const key of Object.keys(inputs)) {
    const input = inputs[key]!;
    const isDefault = Object.is(input.value, input.default);
    out[key] = isDefault ? (effective[key] ?? input.value) : input.value;
  }

  return out as { [K in keyof T]: unknown };
}
