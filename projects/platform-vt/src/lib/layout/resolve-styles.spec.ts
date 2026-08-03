import { describe, it, expect } from 'vitest';
import { resolveFlexStyles, isFlexContainer } from './resolve-styles';
import { DEFAULT_FLEX_STYLES } from './layout-node';
import { createVTNode, resetVTNodeId } from '../renderer/vt-node';
import { beforeEach } from 'vitest';

beforeEach(() => {
  resetVTNodeId();
});

describe('resolveFlexStyles', () => {
  it('returns defaults for empty node', () => {
    const node = createVTNode('element');
    const styles = resolveFlexStyles(node);
    expect(styles).toEqual(DEFAULT_FLEX_STYLES);
  });

  it('resolves flexDirection', () => {
    const node = createVTNode('element');
    node.styles.set('flexDirection', 'column');
    expect(resolveFlexStyles(node).flexDirection).toBe('column');
  });

  it('resolves justifyContent', () => {
    const node = createVTNode('element');
    node.styles.set('justifyContent', 'center');
    expect(resolveFlexStyles(node).justifyContent).toBe('center');
  });

  it('resolves alignItems', () => {
    const node = createVTNode('element');
    node.styles.set('alignItems', 'flex-end');
    expect(resolveFlexStyles(node).alignItems).toBe('flex-end');
  });

  it('resolves flexGrow and flexShrink', () => {
    const node = createVTNode('element');
    node.styles.set('flexGrow', 2);
    node.styles.set('flexShrink', 0);
    const styles = resolveFlexStyles(node);
    expect(styles.flexGrow).toBe(2);
    expect(styles.flexShrink).toBe(0);
  });

  it('resolves width and height', () => {
    const node = createVTNode('element');
    node.styles.set('width', 100);
    node.styles.set('height', 50);
    const styles = resolveFlexStyles(node);
    expect(styles.width).toBe(100);
    expect(styles.height).toBe(50);
  });

  it('resolves padding as number', () => {
    const node = createVTNode('element');
    node.styles.set('padding', 5);
    const styles = resolveFlexStyles(node);
    expect(styles.paddingTop).toBe(5);
    expect(styles.paddingRight).toBe(5);
    expect(styles.paddingBottom).toBe(5);
    expect(styles.paddingLeft).toBe(5);
  });

  it('resolves padding as string (shorthand)', () => {
    const node = createVTNode('element');
    node.styles.set('padding', '1 2 3 4');
    const styles = resolveFlexStyles(node);
    expect(styles.paddingTop).toBe(1);
    expect(styles.paddingRight).toBe(2);
    expect(styles.paddingBottom).toBe(3);
    expect(styles.paddingLeft).toBe(4);
  });

  it('resolves margin as number', () => {
    const node = createVTNode('element');
    node.styles.set('margin', 10);
    const styles = resolveFlexStyles(node);
    expect(styles.marginTop).toBe(10);
    expect(styles.marginRight).toBe(10);
    expect(styles.marginBottom).toBe(10);
    expect(styles.marginLeft).toBe(10);
  });

  it('individual padding overrides shorthand', () => {
    const node = createVTNode('element');
    node.styles.set('padding', 5);
    node.styles.set('paddingTop', 10);
    const styles = resolveFlexStyles(node);
    expect(styles.paddingTop).toBe(10);
    expect(styles.paddingRight).toBe(5);
  });

  it('resolves gap', () => {
    const node = createVTNode('element');
    node.styles.set('gap', 8);
    expect(resolveFlexStyles(node).gap).toBe(8);
  });

  it('resolves textAlign', () => {
    const node = createVTNode('element');
    node.styles.set('textAlign', 'center');
    expect(resolveFlexStyles(node).textAlign).toBe('center');
  });

  it('ignores invalid flexDirection', () => {
    const node = createVTNode('element');
    node.styles.set('flexDirection', 'invalid');
    expect(resolveFlexStyles(node).flexDirection).toBe('row');
  });
});

describe('isFlexContainer', () => {
  it('returns false for text nodes', () => {
    const text = createVTNode('text');
    expect(isFlexContainer(text)).toBe(false);
  });

  it('returns false for comment nodes', () => {
    const comment = createVTNode('comment');
    expect(isFlexContainer(comment)).toBe(false);
  });

  it('returns true for element with display: flex', () => {
    const node = createVTNode('element');
    node.styles.set('display', 'flex');
    expect(isFlexContainer(node)).toBe(true);
  });

  it('returns false for element with display: block', () => {
    const node = createVTNode('element');
    node.styles.set('display', 'block');
    expect(isFlexContainer(node)).toBe(false);
  });

  it('returns false for element with display: none', () => {
    const node = createVTNode('element');
    node.styles.set('display', 'none');
    expect(isFlexContainer(node)).toBe(false);
  });

  it('returns true for element with children (default)', () => {
    const parent = createVTNode('element');
    const child = createVTNode('element');
    parent.children.push(child);
    expect(isFlexContainer(parent)).toBe(true);
  });

  it('returns false for element without children (default)', () => {
    const node = createVTNode('element');
    expect(isFlexContainer(node)).toBe(false);
  });
});
