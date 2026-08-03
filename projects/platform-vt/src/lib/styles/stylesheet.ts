/**
 * Types for the VT stylesheet DSL.
 */

/** A single style value, kept as-is from the DSL declaration. */
export type VTStyleValue = string | number;

/** One CSS-like rule: selector(s) + declaration map. */
export interface VTStyleRule {
  selectors: string[];
  styles: Record<string, VTStyleValue>;
}

/** Parsed stylesheet: an ordered list of rules. */
export interface VTStyleSheet {
  rules: VTStyleRule[];
}

/**
 * Map DSL property names to component input names.
 *
 * Covers every style-relevant input of all library components:
 * - layout (`flex-direction`, `justify-content`, …)
 * - spacing (`padding`, `margin`, `gap`)
 * - box (`width`, `height`, `border`)
 * - typography and color (`color`, `background-color`, `font-weight`, …)
 * - component-specific appearance (`glyph`, `variant`, `type`, `style`)
 *
 * Any name not listed here is still handled by the parser via a generic
 * kebab-case → camelCase conversion, so no property is ever dropped.
 */
export const PROPERTY_MAP: Record<string, string> = {
  // Layout
  'flex-direction': 'flexDirection',
  'flex-grow': 'flexGrow',
  'flex-shrink': 'flexShrink',
  'flex-basis': 'flexBasis',
  'justify-content': 'justifyContent',
  'align-items': 'alignItems',
  'align-self': 'alignSelf',
  'text-align': 'textAlign',
  'min-width': 'minWidth',
  'max-width': 'maxWidth',
  'min-height': 'minHeight',
  'max-height': 'maxHeight',

  // Spacing
  padding: 'padding',
  'padding-top': 'paddingTop',
  'padding-right': 'paddingRight',
  'padding-bottom': 'paddingBottom',
  'padding-left': 'paddingLeft',
  margin: 'margin',
  'margin-top': 'marginTop',
  'margin-right': 'marginRight',
  'margin-bottom': 'marginBottom',
  'margin-left': 'marginLeft',
  gap: 'gap',

  // Box
  width: 'width',
  height: 'height',
  border: 'border',

  // Typography & color
  color: 'color',
  'background-color': 'backgroundColor',
  'font-weight': 'fontWeight',
  'font-style': 'fontStyle',
  'text-decoration': 'textDecoration',
  opacity: 'opacity',
  'white-space': 'wrap',

  // Component-specific appearance
  glyph: 'glyph',
  variant: 'variant',
  type: 'type',
  style: 'style',
};
