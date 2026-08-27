import type { VTKeyEvent } from '../services/input.service';

/**
 * Vim-style navigation presets for terminal components.
 *
 * Interactive components (list, tree, tabs, menu, scroll) accept a `vim`
 * input; when enabled, the navigation keys below are translated to the
 * canonical key names before the regular handlers run — `j`/`k` move the
 * selection instead of typing characters.
 */

/** Default vim navigation map: key → canonical key name. */
export const VIM_NAVIGATION: Record<string, string> = {
  j: 'down',
  k: 'up',
  h: 'left',
  l: 'right',
};

/**
 * Translate a key event through a vim map.
 *
 * @param event - The raw key event.
 * @param map - Key → canonical name mapping (defaults to {@link VIM_NAVIGATION}).
 * @returns The translated event, or the original when nothing maps.
 *
 * @example
 * ```typescript
 * const event = vimTranslate({ name: 'j', ... });
 * // { name: 'down', ... }
 * ```
 */
export function vimTranslate(
  event: VTKeyEvent,
  map: Record<string, string> = VIM_NAVIGATION,
): VTKeyEvent {
  if (event.ctrl || event.meta) return event;
  const mapped = map[event.name];
  if (!mapped) return event;
  return { ...event, name: mapped };
}