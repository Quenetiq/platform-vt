import type { VTNode } from '../renderer/vt-node';

/**
 * A positioned node in the layout tree, produced by {@link FlexLayout.calculate}.
 *
 * Contains the VTNode reference, computed position/size, and child layouts.
 */
export interface LayoutNode {
  /** The source VTNode. */
  vtNode: VTNode;
  /** X position in terminal columns. */
  x: number;
  /** Y position in terminal rows. */
  y: number;
  /** Width in terminal columns. */
  width: number;
  /** Height in terminal rows. */
  height: number;
  /** Laid-out children. */
  children: LayoutNode[];
}

/**
 * Resolved flexbox styles for a VTNode.
 *
 * All properties have concrete values (no `'auto'` for dimensions that
 * were resolved during layout).
 */
export interface FlexStyles {
  /** Flex direction: `'row'` (left-to-right) or `'column'` (top-to-bottom). */
  flexDirection: 'row' | 'column';
  /** Main-axis alignment. */
  justifyContent:
    | 'flex-start'
    | 'center'
    | 'flex-end'
    | 'space-between'
    | 'space-around'
    | 'space-evenly';
  /** Cross-axis alignment. */
  alignItems: 'flex-start' | 'center' | 'flex-end' | 'stretch';
  /** Per-child cross-axis alignment override. */
  alignSelf: 'flex-start' | 'center' | 'flex-end' | 'stretch' | 'auto';
  /** Flex grow factor. */
  flexGrow: number;
  /** Flex shrink factor. */
  flexShrink: number;
  /** Flex basis: a number in columns/rows, or `'auto'`. */
  flexBasis: number | 'auto';
  /** Gap between children. */
  gap: number;
  /** Width in columns, or `'auto'`. */
  width: number | 'auto';
  /** Height in rows, or `'auto'`. */
  height: number | 'auto';
  /** Minimum width constraint. */
  minWidth: number | 'auto';
  /** Maximum width constraint. */
  maxWidth: number | 'auto';
  /** Minimum height constraint. */
  minHeight: number | 'auto';
  /** Maximum height constraint. */
  maxHeight: number | 'auto';
  /** Top padding. */
  paddingTop: number;
  /** Right padding. */
  paddingRight: number;
  /** Bottom padding. */
  paddingBottom: number;
  /** Left padding. */
  paddingLeft: number;
  /** Top margin. */
  marginTop: number;
  /** Right margin. */
  marginRight: number;
  /** Bottom margin. */
  marginBottom: number;
  /** Left margin. */
  marginLeft: number;
  /** Text alignment. */
  textAlign: 'left' | 'center' | 'right';
}

/**
 * Represents spacing values (padding or margin) for all four sides.
 */
export interface Spacing {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/**
 * Default flexbox styles applied when no styles are set on a VTNode.
 */
export const DEFAULT_FLEX_STYLES: FlexStyles = {
  flexDirection: 'row',
  justifyContent: 'flex-start',
  alignItems: 'stretch',
  alignSelf: 'auto',
  flexGrow: 0,
  flexShrink: 1,
  flexBasis: 'auto',
  gap: 0,
  width: 'auto',
  height: 'auto',
  minWidth: 'auto',
  maxWidth: 'auto',
  minHeight: 'auto',
  maxHeight: 'auto',
  paddingTop: 0,
  paddingRight: 0,
  paddingBottom: 0,
  paddingLeft: 0,
  marginTop: 0,
  marginRight: 0,
  marginBottom: 0,
  marginLeft: 0,
  textAlign: 'left',
};
