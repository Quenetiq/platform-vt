import type { VTStyleReader } from '../styles/style-registry';
import { mergeTheme } from '../styles/style-registry';

/**
 * A single style input that a host directive exposes on the component.
 *
 * `default` is the "unset" sentinel used both for the theme merge (the theme
 * only wins while the input sits at its default) and to decide whether the
 * host attribute should be written at all.
 */
export interface HostStyleInput {
  value: string | number;
  default: string | number;
}

/**
 * Apply themed styles to a component host element.
 *
 * Merges the stylesheet (tag rules for `selector` plus the host's classes)
 * with the directive's input values, then mirrors the result onto the host
 * element as kebab-case attributes for the layout engine to read.
 *
 * Values that match their sentinel (`''`, `0` or `'auto'`) are removed from
 * the host so the layout falls back to its defaults.
 *
 * @param el - The host element.
 * @param reader - The themed style reader, or `null` when theming is off.
 * @param selector - The component selector (e.g. `vt-box`).
 * @param inputs - Input name → current value / default sentinel.
 */
export function applyHostStyles(
  el: HTMLElement,
  reader: VTStyleReader | null,
  selector: string,
  inputs: Record<string, HostStyleInput>,
): void {
  const classes = el.getAttribute('class')?.split(/\s+/) ?? [];
  const themed = mergeTheme(reader, selector, inputs, classes);

  for (const key of Object.keys(inputs)) {
    const value = themed[key];
    if (value === '' || value === 0 || value === 'auto') {
      el.removeAttribute(toKebab(key));
    } else {
      el.setAttribute(toKebab(key), String(value));
    }
  }
}

function toKebab(name: string): string {
  return name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
}
