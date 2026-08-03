import type { VTNode } from '../renderer/vt-node';
import type { LayoutNode, FlexStyles } from './layout-node';
import { resolveFlexStyles, isFlexContainer } from './resolve-styles';
import { readDomLayout, type DomLayoutNode } from './dom-adapter';
import { wrapText } from '../output/wrap-text';

/**
 * Custom flexbox layout engine for terminal rendering.
 *
 * Calculates positions and sizes for all nodes in the VT tree
 * based on flexbox rules (direction, justify, align, grow, shrink, gap).
 *
 * @example
 * ```typescript
 * const layout = new FlexLayout();
 * const tree = layout.calculate(rootNode, 80, 24);
 * ```
 */
export class FlexLayout {
  /**
   * Calculate the layout tree for a VT node hierarchy.
   *
   * @param root - The root VTNode to lay out.
   * @param availableWidth - Available width in terminal columns.
   * @param availableHeight - Available height in terminal rows.
   * @returns The positioned layout tree.
   */
  calculate(root: VTNode, availableWidth: number, availableHeight: number): LayoutNode {
    return this.layoutNode(root, 0, 0, availableWidth, availableHeight);
  }

  /**
   * Calculate the layout tree from a DOM element.
   *
   * Reads the DOM element tree, converts it to VTNode-like nodes,
   * and runs the flex layout engine.
   *
   * @param rootEl - The root DOM element (e.g. document.getElementById('vt-root')).
   * @param availableWidth - Available width in terminal columns.
   * @param availableHeight - Available height in terminal rows.
   * @returns The positioned layout tree.
   */
  calculateFromDom(rootEl: Element, availableWidth: number, availableHeight: number): LayoutNode {
    const domTree = readDomLayout(rootEl);
    const vnode = this.domNodeToVTNode(domTree);
    return this.calculate(vnode, availableWidth, availableHeight);
  }

  private domNodeToVTNode(dom: DomLayoutNode, parent: VTNode | null = null): VTNode {
    return {
      id: 0,
      type: 'element',
      tagName: dom.tagName,
      parent,
      children: dom.children.map((c) => this.domNodeToVTNode(c, null)),
      previousSibling: null,
      nextSibling: null,
      attributes: new Map(),
      classes: new Set(),
      styles: new Map(dom.styles),
      properties: new Map(),
      textContent: dom.textContent,
      commentContent: '',
      layout: null,
      dirty: true,
    };
  }

  private layoutNode(
    vtNode: VTNode,
    x: number,
    y: number,
    availableWidth: number,
    availableHeight: number,
  ): LayoutNode {
    const styles = resolveFlexStyles(vtNode);
    const padX = styles.paddingLeft + styles.paddingRight;
    const padY = styles.paddingTop + styles.paddingBottom;

    const contentWidth = Math.max(0, availableWidth - padX);
    const contentHeight = Math.max(0, availableHeight - padY);

    const nodeX = x + styles.marginLeft;
    const nodeY = y + styles.marginTop;

    if (vtNode.styles.get('display') === 'none') {
      return { vtNode, x, y, width: 0, height: 0, children: [] };
    }

    if (vtNode.type === 'text') {
      const padL = styles.paddingLeft;
      const padT = styles.paddingTop;
      const availW = Math.max(0, contentWidth - styles.paddingLeft - styles.paddingRight);
      const padV = styles.paddingTop + styles.paddingBottom;
      const wrap = vtNode.styles.get('wrap') === 'wrap';
      const lineCount =
        wrap && availW > 0
          ? wrapText(vtNode.textContent, availW).length
          : Math.max(1, vtNode.textContent.split('\n').length);
      return {
        vtNode,
        x: Math.floor(x + padL),
        y: Math.floor(y + padT),
        width: Math.min(vtNode.textContent.length, availW),
        height: lineCount + padV,
        children: [],
      };
    }

    if (vtNode.type === 'comment') {
      return { vtNode, x, y, width: 0, height: 0, children: [] };
    }

    if (!isFlexContainer(vtNode)) {
      const explicitW = typeof styles.width === 'number' ? styles.width : contentWidth;
      const explicitH = typeof styles.height === 'number' ? styles.height : undefined;
      const text = vtNode.textContent;
      const lineCount = text.length > 0 ? text.split('\n').length : 1;
      const h = explicitH ?? lineCount;
      return {
        vtNode,
        x: Math.floor(x + styles.paddingLeft),
        y: Math.floor(y + styles.paddingTop),
        width: Math.floor(explicitW),
        height: Math.max(1, Math.floor(Math.min(h, contentHeight))),
        children: [],
      };
    }

    // Resolve explicit width/height (border-box: the value includes padding)
    let boxW = Math.floor(contentWidth);
    if (typeof styles.width === 'number') boxW = Math.max(0, styles.width - padX);

    let boxH = Math.floor(contentHeight);
    if (typeof styles.height === 'number') boxH = Math.max(0, styles.height - padY);

    // Clamp
    boxW = this.clamp(boxW, styles.minWidth, styles.maxWidth, availableWidth);
    boxH = this.clamp(boxH, styles.minHeight, styles.maxHeight, availableHeight);

    const isRow = styles.flexDirection === 'row';
    const mainSize = isRow ? boxW : boxH;
    const crossSize = Math.floor(isRow ? contentHeight : contentWidth);

    // A scroll container is a fixed-size viewport whose children keep their
    // natural sizes; overflow is clipped and offset by scrollTop.
    const isScrollContainer = vtNode.styles.get('overflow') === 'scroll';

    // Resolve flex-basis for each child
    const childLayouts: LayoutNode[] = [];
    const mainSizes: number[] = [];
    let totalGap = 0;

    for (const child of vtNode.children) {
      const cs = resolveFlexStyles(child);
      const basis = this.resolveBasis(child, cs, isRow ? boxW : boxH, isRow, false, this.childWrapWidth(cs, boxW));
      mainSizes.push(basis);
      totalGap += cs.gap;
    }

    // Distribute free space
    const totalMain = mainSizes.reduce((a, b) => a + b, 0) + totalGap;
    const freeSpace = mainSize - totalMain;

    const totalGrow = vtNode.children.reduce(
      (sum, child) => sum + resolveFlexStyles(child).flexGrow,
      0,
    );
    const totalShrink = vtNode.children.reduce(
      (sum, child, i) => sum + resolveFlexStyles(child).flexShrink * mainSizes[i],
      0,
    );

    if (freeSpace > 0 && totalGrow > 0 && !isScrollContainer) {
      for (let i = 0; i < vtNode.children.length; i++) {
        const cs = resolveFlexStyles(vtNode.children[i]);
        mainSizes[i] = Math.floor(mainSizes[i] + (freeSpace * cs.flexGrow) / totalGrow);
      }
    } else if (freeSpace < 0 && totalShrink > 0 && !isScrollContainer) {
      for (let i = 0; i < vtNode.children.length; i++) {
        const cs = resolveFlexStyles(vtNode.children[i]);
        const shrinkAmount =
          (freeSpace * cs.flexShrink * mainSizes[i]) / totalShrink;
        mainSizes[i] = Math.floor(mainSizes[i] + shrinkAmount);
      }
    } else if (freeSpace < 0 && totalMain > 0 && !isScrollContainer) {
      for (let i = 0; i < vtNode.children.length; i++) {
        mainSizes[i] = Math.floor((mainSizes[i] / totalMain) * mainSize);
      }
    }

    // Layout children recursively
    const gap = styles.gap;
    const justifyGap = Math.floor(this.calculateJustifyGap(freeSpace, styles, vtNode.children.length));
    let offset = Math.floor(this.computeJustifyOffset(freeSpace, totalMain, mainSize, styles, gap, vtNode.children.length));

    for (let i = 0; i < vtNode.children.length; i++) {
      const child = vtNode.children[i];
      const childMain = Math.max(0, mainSizes[i]);

      const childX = isRow ? Math.floor(nodeX + styles.paddingLeft + offset) : Math.floor(nodeX + styles.paddingLeft);
      const childY = isRow ? Math.floor(nodeY + styles.paddingTop) : Math.floor(nodeY + styles.paddingTop + offset);

      // Scroll containers give each child its full natural size so overflow
      // can be scrolled into view instead of being squeezed away.
      const childAvailMain = isScrollContainer
        ? Math.max(childMain, 1)
        : Math.min(childMain, Math.max(0, mainSize - offset + gap));
      let childAvailCross = crossSize;

      const childStyles = resolveFlexStyles(child);
      if (childStyles.alignSelf === 'stretch' || (styles.alignItems === 'stretch' && childStyles.alignSelf !== 'flex-start')) {
        childAvailCross = crossSize;
      }

      const childW = Math.floor(isRow ? childAvailMain : childAvailCross);
      const childH = Math.floor(isRow ? childAvailCross : childAvailMain);

      const childLayout = this.layoutNode(child, childX, childY, childW, childH);
      childLayouts.push(childLayout);

      offset += Math.max(1, childMain) + gap + justifyGap;
    }

    // Position on cross-axis (align-items)
    this.positionCrossAxis(childLayouts, styles, crossSize, isRow);

    // Scroll offset: pin the newest content to the bottom of the viewport.
    if (isScrollContainer) {
      const contentHeight = childLayouts.reduce(
        (max, c) => Math.max(max, c.y + c.height - Math.floor(y)),
        0,
      );
      const viewport = Math.floor(boxH + padY);
      const scrollTop = this.resolveScrollTop(vtNode, contentHeight, viewport);
      if (scrollTop > 0) {
        for (const child of childLayouts) {
          this.applyScrollOffset(child, -scrollTop);
        }
      }
      vtNode.styles.set('scrollTop', scrollTop);
      vtNode.styles.set('scrollHeight', contentHeight);
    }

    return {
      vtNode,
      x: Math.floor(x),
      y: Math.floor(y),
      width: Math.floor(boxW + padX),
      height: Math.floor(boxH + padY),
      children: childLayouts,
    };
  }

  private resolveScrollTop(vtNode: VTNode, contentHeight: number, viewportHeight: number): number {
    const explicit = vtNode.styles.get('scrollTop');
    if (typeof explicit === 'number') {
      return Math.max(0, Math.min(explicit, Math.max(0, contentHeight - viewportHeight)));
    }
    // Default behaviour: keep the newest content visible (chat-style).
    return Math.max(0, contentHeight - viewportHeight);
  }

  private applyScrollOffset(node: LayoutNode, dy: number): void {
    if (dy === 0) return;
    node.y += dy;
    for (const child of node.children) {
      this.applyScrollOffset(child, dy);
    }
  }

  private childWrapWidth(styles: FlexStyles, parentContentWidth: number): number {
    return Math.max(0, parentContentWidth - styles.paddingLeft - styles.paddingRight);
  }

  private resolveBasis(
    vtNode: VTNode,
    styles: FlexStyles,
    availableMain: number,
    parentIsRow: boolean,
    cross = false,
    wrapWidth = 0,
  ): number {
    if (!cross && styles.flexBasis !== 'auto' && typeof styles.flexBasis === 'number') {
      return styles.flexBasis;
    }

    // flexGrow > 0 → basis = 0 (like CSS). Only along the main axis; the
    // cross-axis size of a growing node must come from its content.
    if (!cross && styles.flexGrow > 0) return 0;

    const explicitSize = parentIsRow ? styles.width : styles.height;
    if (typeof explicitSize === 'number') return explicitSize;

    if (vtNode.type === 'text') {
      // Along the main axis a text node is as wide as its content (or one line
      // tall); across the main axis it is always a single row.
      if (cross) return 1;
      const padMain = parentIsRow
        ? styles.paddingLeft + styles.paddingRight
        : styles.paddingTop + styles.paddingBottom;
      if (!parentIsRow) {
        // In a column the height grows with the wrapped line count.
        const wrap = vtNode.styles.get('wrap') === 'wrap';
        const lines =
          wrap && wrapWidth > 0
            ? wrapText(vtNode.textContent, wrapWidth).length
            : Math.max(1, vtNode.textContent.split('\n').length);
        return lines + padMain;
      }
      return (parentIsRow ? Math.max(1, vtNode.textContent.length) : 1) + padMain;
    }

    if (vtNode.children.length === 0) {
      if (!isFlexContainer(vtNode)) {
        const text = vtNode.textContent;
        return parentIsRow
          ? Math.max(1, text.length)
          : Math.max(1, text.split('\n').length);
      }
      const min = parentIsRow ? styles.minWidth : styles.minHeight;
      return typeof min === 'number' ? min : 0;
    }

    // Auto basis: compute based on this node's own flex direction
    const nodeIsRow = styles.flexDirection === 'row';
    // A container's own padding is part of its box along the parent's main axis
    const ownPadMain = parentIsRow
      ? styles.paddingLeft + styles.paddingRight
      : styles.paddingTop + styles.paddingBottom;

    if (nodeIsRow === parentIsRow) {
      let total = 0;
      for (const child of vtNode.children) {
        const cs = resolveFlexStyles(child);
        total += this.resolveBasis(child, cs, availableMain, nodeIsRow, false, this.childWrapWidth(cs, wrapWidth));
      }
      return total + ownPadMain;
    }

    // Cross-direction parent: return cross-axis size = max of children in cross direction
    let maxVal = 0;
    for (const child of vtNode.children) {
      const cs = resolveFlexStyles(child);
      const childBasis = this.resolveBasis(child, cs, availableMain, !nodeIsRow, true, this.childWrapWidth(cs, wrapWidth));
      maxVal = Math.max(maxVal, childBasis);
    }
    return maxVal + ownPadMain;
  }

  private computeJustifyOffset(
    freeSpace: number,
    totalMain: number,
    mainSize: number,
    styles: FlexStyles,
    gap: number,
    childCount: number,
  ): number {
    const { justifyContent } = styles;
    if (justifyContent === 'flex-start' || childCount === 0) return 0;

    if (justifyContent === 'center') return freeSpace / 2;

    if (justifyContent === 'flex-end') return freeSpace;

    if (justifyContent === 'space-between') {
      return 0;
    }

    if (justifyContent === 'space-around') {
      return freeSpace / childCount / 2;
    }

    if (justifyContent === 'space-evenly') {
      return freeSpace / (childCount + 1);
    }

    return 0;
  }

  private calculateJustifyGap(
    freeSpace: number,
    styles: FlexStyles,
    childCount: number,
  ): number {
    const { justifyContent } = styles;
    if (childCount <= 1) return 0;

    if (justifyContent === 'space-between') {
      return freeSpace / (childCount - 1);
    }

    if (justifyContent === 'space-around') {
      return freeSpace / childCount;
    }

    if (justifyContent === 'space-evenly') {
      return freeSpace / (childCount + 1);
    }

    return 0;
  }

  private positionCrossAxis(
    children: LayoutNode[],
    styles: FlexStyles,
    crossSize: number,
    isRow: boolean,
  ): void {
    for (const child of children) {
      const childCross = isRow ? child.height : child.width;
      let crossOffset = 0;

      switch (styles.alignItems) {
        case 'center':
          crossOffset = (crossSize - childCross) / 2;
          break;
        case 'flex-end':
          crossOffset = crossSize - childCross;
          break;
        case 'stretch':
          if (isRow) {
            child.height = crossSize;
          } else {
            child.width = crossSize;
          }
          break;
        case 'flex-start':
        default:
          break;
      }

      if (crossOffset > 0) {
        if (isRow) {
          child.y += crossOffset;
        } else {
          child.x += crossOffset;
        }
      }
    }
  }

  private clamp(
    value: number,
    min: number | 'auto',
    max: number | 'auto',
    limit: number,
  ): number {
    let result = value;
    if (typeof min === 'number') result = Math.max(result, min);
    if (typeof max === 'number') result = Math.min(result, max);
    return Math.min(result, limit);
  }
}
