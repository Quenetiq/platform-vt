import type { VTNode } from '../renderer/vt-node';
import { DEFAULT_FLEX_STYLES, type FlexStyles } from './layout-node';

/**
 * Resolve VTNode inline styles into a complete {@link FlexStyles} object.
 *
 * Falls back to {@link DEFAULT_FLEX_STYLES} for any property not set on the node.
 * Handles shorthand padding/margin strings (e.g., `'1 2 3 4'`).
 *
 * @param node - The VTNode whose styles to resolve.
 * @returns A complete FlexStyles object with all properties set.
 */
export function resolveFlexStyles(node: VTNode): FlexStyles {
  const styles = { ...DEFAULT_FLEX_STYLES };
  const s = node.styles;

  const pos = s.get('position');
  if (pos === 'relative' || pos === 'absolute') {
    styles.position = pos;
  }

  const left = s.get('left');
  if (typeof left === 'number') styles.left = left;

  const top = s.get('top');
  if (typeof top === 'number') styles.top = top;

  const flexDir = s.get('flexDirection');
  if (flexDir === 'row' || flexDir === 'column') {
    styles.flexDirection = flexDir;
  }

  const jc = s.get('justifyContent');
  if (
    jc === 'flex-start' ||
    jc === 'center' ||
    jc === 'flex-end' ||
    jc === 'space-between' ||
    jc === 'space-around' ||
    jc === 'space-evenly'
  ) {
    styles.justifyContent = jc;
  }

  const ai = s.get('alignItems');
  if (
    ai === 'flex-start' ||
    ai === 'center' ||
    ai === 'flex-end' ||
    ai === 'stretch'
  ) {
    styles.alignItems = ai;
  }

  const as = s.get('alignSelf');
  if (
    as === 'flex-start' ||
    as === 'center' ||
    as === 'flex-end' ||
    as === 'stretch' ||
    as === 'auto'
  ) {
    styles.alignSelf = as;
  }

  const grow = s.get('flexGrow');
  if (typeof grow === 'number') styles.flexGrow = grow;

  const shrink = s.get('flexShrink');
  if (typeof shrink === 'number') styles.flexShrink = shrink;

  const basis = s.get('flexBasis');
  if (typeof basis === 'number' || basis === 'auto') {
    styles.flexBasis = basis;
  }

  const gap = s.get('gap');
  if (typeof gap === 'number') styles.gap = gap;

  const w = s.get('width');
  if (typeof w === 'number' || w === 'auto') styles.width = w;

  const h = s.get('height');
  if (typeof h === 'number' || h === 'auto') styles.height = h;

  const minW = s.get('minWidth');
  if (typeof minW === 'number' || minW === 'auto') styles.minWidth = minW;

  const maxW = s.get('maxWidth');
  if (typeof maxW === 'number' || maxW === 'auto') styles.maxWidth = maxW;

  const minH = s.get('minHeight');
  if (typeof minH === 'number' || minH === 'auto') styles.minHeight = minH;

  const maxH = s.get('maxHeight');
  if (typeof maxH === 'number' || maxH === 'auto') styles.maxHeight = maxH;

  const ta = s.get('textAlign');
  if (ta === 'left' || ta === 'center' || ta === 'right') {
    styles.textAlign = ta;
  }

  // Padding
  const pad = s.get('padding');
  if (typeof pad === 'number') {
    styles.paddingTop = pad;
    styles.paddingRight = pad;
    styles.paddingBottom = pad;
    styles.paddingLeft = pad;
  } else if (typeof pad === 'string') {
    parseSpacing(pad, styles, 'padding');
  }

  const padT = s.get('paddingTop');
  if (typeof padT === 'number') styles.paddingTop = padT;
  const padR = s.get('paddingRight');
  if (typeof padR === 'number') styles.paddingRight = padR;
  const padB = s.get('paddingBottom');
  if (typeof padB === 'number') styles.paddingBottom = padB;
  const padL = s.get('paddingLeft');
  if (typeof padL === 'number') styles.paddingLeft = padL;

  // Margin
  const mar = s.get('margin');
  if (typeof mar === 'number') {
    styles.marginTop = mar;
    styles.marginRight = mar;
    styles.marginBottom = mar;
    styles.marginLeft = mar;
  } else if (typeof mar === 'string') {
    parseSpacing(mar, styles, 'margin');
  }

  const marT = s.get('marginTop');
  if (typeof marT === 'number') styles.marginTop = marT;
  const marR = s.get('marginRight');
  if (typeof marR === 'number') styles.marginRight = marR;
  const marB = s.get('marginBottom');
  if (typeof marB === 'number') styles.marginBottom = marB;
  const marL = s.get('marginLeft');
  if (typeof marL === 'number') styles.marginLeft = marL;

  return styles;
}

function parseSpacing(
  value: string | number,
  styles: FlexStyles,
  prefix: 'padding' | 'margin',
): void {
  if (typeof value === 'number') return;
  const parts = value.split(' ').map(Number);
  const count = parts.length;

  if (count === 1) {
    styles[`${prefix}Top`] = parts[0] ?? 0;
    styles[`${prefix}Right`] = parts[0] ?? 0;
    styles[`${prefix}Bottom`] = parts[0] ?? 0;
    styles[`${prefix}Left`] = parts[0] ?? 0;
  } else if (count === 2) {
    styles[`${prefix}Top`] = parts[0] ?? 0;
    styles[`${prefix}Right`] = parts[1] ?? 0;
    styles[`${prefix}Bottom`] = parts[0] ?? 0;
    styles[`${prefix}Left`] = parts[1] ?? 0;
  } else if (count >= 4) {
    styles[`${prefix}Top`] = parts[0] ?? 0;
    styles[`${prefix}Right`] = parts[1] ?? 0;
    styles[`${prefix}Bottom`] = parts[2] ?? 0;
    styles[`${prefix}Left`] = parts[3] ?? 0;
  }
}

/**
 * Determine whether a VTNode should be treated as a flex container.
 *
 * A node is a flex container if:
 * - It has `display: flex` set, OR
 * - It is an element node with children (default behavior)
 *
 * Text and comment nodes are never flex containers.
 *
 * @param node - The VTNode to check.
 * @returns `true` if the node is a flex container.
 */
export function isFlexContainer(node: VTNode): boolean {
  if (node.type === 'text' || node.type === 'comment') return false;
  const display = node.styles.get('display');
  if (display === 'flex') return true;
  if (display === 'block' || display === 'none') return false;
  // Default: element with children is flex container
  return node.children.length > 0;
}
