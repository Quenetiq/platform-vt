import { describe, it, expect, beforeEach } from 'vitest';
import { FlexLayout } from './flex-layout';
import { createVTNode, appendVTChild, resetVTNodeId } from '../renderer/vt-node';

beforeEach(() => {
  resetVTNodeId();
});

describe('FlexLayout', () => {
  const layout = new FlexLayout();

  it('lays out a single text node', () => {
    const root = createVTNode('root');
    root.styles.set('alignItems', 'flex-start');
    const text = createVTNode('text');
    text.textContent = 'hello';
    appendVTChild(root, text);

    const result = layout.calculate(root, 80, 24);

    expect(result.vtNode).toBe(root);
    expect(result.children.length).toBe(1);
    expect(result.children[0].vtNode).toBe(text);
    expect(result.children[0].width).toBe(5);
    expect(result.children[0].height).toBe(1);
  });

  it('lays out children in row direction', () => {
    const root = createVTNode('root');
    root.styles.set('flexDirection', 'row');
    root.styles.set('width', 40);
    root.styles.set('height', 10);

    const a = createVTNode('text');
    a.textContent = 'AAA';
    const b = createVTNode('text');
    b.textContent = 'BBBB';

    appendVTChild(root, a);
    appendVTChild(root, b);

    const result = layout.calculate(root, 80, 24);

    expect(result.children.length).toBe(2);
    expect(result.children[0].width).toBe(3);
    expect(result.children[1].width).toBe(4);
    // In row direction, second child is to the right of the first
    expect(result.children[1].x).toBeGreaterThan(result.children[0].x);
  });

  it('lays out children in column direction', () => {
    const root = createVTNode('root');
    root.styles.set('flexDirection', 'column');
    root.styles.set('width', 40);
    root.styles.set('height', 10);

    const a = createVTNode('text');
    a.textContent = 'AAA';
    const b = createVTNode('text');
    b.textContent = 'BBBB';

    appendVTChild(root, a);
    appendVTChild(root, b);

    const result = layout.calculate(root, 80, 24);

    expect(result.children.length).toBe(2);
    // In column direction, second child is below the first
    expect(result.children[1].y).toBeGreaterThan(result.children[0].y);
  });

  it('respects padding', () => {
    const root = createVTNode('root');
    root.styles.set('paddingLeft', 5);
    root.styles.set('paddingTop', 3);
    root.styles.set('width', 20);
    root.styles.set('height', 10);

    const text = createVTNode('text');
    text.textContent = 'hi';
    appendVTChild(root, text);

    const result = layout.calculate(root, 80, 24);

    // Text should be offset by padding
    expect(result.children[0].x).toBeGreaterThanOrEqual(5);
  });

  it('respects explicit width/height', () => {
    const root = createVTNode('root');
    root.styles.set('width', 30);
    root.styles.set('height', 15);

    const result = layout.calculate(root, 80, 24);

    expect(result.width).toBe(30);
    expect(result.height).toBe(15);
  });

  it('handles empty root', () => {
    const root = createVTNode('root');

    const result = layout.calculate(root, 80, 24);

    expect(result.children).toEqual([]);
  });

  it('lays out nested flex containers', () => {
    const root = createVTNode('root');
    root.styles.set('width', 80);
    root.styles.set('height', 24);

    const row = createVTNode('element', 'row');
    row.styles.set('flexDirection', 'row');
    row.styles.set('width', 80);

    const a = createVTNode('text');
    a.textContent = 'left';
    const b = createVTNode('text');
    b.textContent = 'right';

    appendVTChild(row, a);
    appendVTChild(row, b);
    appendVTChild(root, row);

    const result = layout.calculate(root, 80, 24);

    expect(result.children.length).toBe(1);
    const rowLayout = result.children[0];
    expect(rowLayout.children.length).toBe(2);
    expect(rowLayout.children[1].x).toBeGreaterThan(rowLayout.children[0].x);
  });

  it('sizes a wrapped text node to its line count', () => {
    const root = createVTNode('root');
    root.styles.set('flexDirection', 'column');
    root.styles.set('width', 20);
    root.styles.set('height', 20);

    const text = createVTNode('text');
    text.textContent = 'aaa bbb ccc ddd eee fff ggg hhh';
    text.styles.set('wrap', 'wrap');
    appendVTChild(root, text);

    const result = layout.calculate(root, 20, 20);

    // At width 20 the text wraps onto 2 lines.
    expect(result.children[0].height).toBe(2);
  });

  it('uses the wrapped line count for column text basis', () => {
    const root = createVTNode('root');
    root.styles.set('flexDirection', 'column');
    root.styles.set('width', 20);
    root.styles.set('height', 20);

    const block = createVTNode('element', 'block');
    block.styles.set('flexDirection', 'column');
    const text = createVTNode('text');
    text.textContent = 'aaa bbb ccc ddd eee fff ggg hhh';
    text.styles.set('wrap', 'wrap');
    appendVTChild(block, text);
    appendVTChild(root, block);

    const result = layout.calculate(root, 20, 20);

    // The block's height follows its wrapped text (2 lines, no padding).
    expect(result.children[0].height).toBe(2);
  });

  it('does not scroll content that fits the viewport', () => {
    const root = createVTNode('element', 'scroll');
    root.styles.set('overflow', 'scroll');
    root.styles.set('flexDirection', 'column');
    root.styles.set('width', 20);
    root.styles.set('height', 6);

    const a = createVTNode('text');
    a.textContent = 'aaa';
    const b = createVTNode('text');
    b.textContent = 'bbb';
    appendVTChild(root, a);
    appendVTChild(root, b);

    const result = layout.calculate(root, 20, 6);

    expect(result.vtNode.styles.get('scrollTop')).toBe(0);
    expect(result.children[0].y).toBe(0);
    expect(result.children[1].y).toBe(1);
  });

  it('pins overflowing content to the bottom of a scroll viewport', () => {
    const root = createVTNode('element', 'scroll');
    root.styles.set('overflow', 'scroll');
    root.styles.set('flexDirection', 'column');
    root.styles.set('width', 20);
    root.styles.set('height', 6);

    const a = createVTNode('text');
    a.textContent = 'aaa bbb ccc ddd eee fff ggg hhh';
    a.styles.set('wrap', 'wrap');
    const b = createVTNode('text');
    b.textContent = 'xxx yyy zzz www vvv uuu ttt sss';
    b.styles.set('wrap', 'wrap');
    appendVTChild(root, a);
    appendVTChild(root, b);

    const result = layout.calculate(root, 20, 6);

    // Two wrapped 2-line texts → content height 4 vs viewport 6 → no shift.
    expect(result.vtNode.styles.get('scrollTop')).toBe(0);
    expect(result.children[1].y).toBe(2);
  });

  it('scrolls when content exceeds the viewport height', () => {
    const root = createVTNode('element', 'scroll');
    root.styles.set('overflow', 'scroll');
    root.styles.set('flexDirection', 'column');
    root.styles.set('width', 20);
    root.styles.set('height', 4);

    const a = createVTNode('text');
    a.textContent = 'aaa bbb ccc ddd eee fff ggg hhh';
    a.styles.set('wrap', 'wrap');
    const b = createVTNode('text');
    b.textContent = 'xxx yyy zzz www vvv uuu ttt sss';
    b.styles.set('wrap', 'wrap');
    appendVTChild(root, a);
    appendVTChild(root, b);

    const result = layout.calculate(root, 20, 4);

    // Content height 4 vs viewport 4 → no shift.
    expect(result.vtNode.styles.get('scrollTop')).toBe(0);
    expect(result.children[0].y).toBe(0);
  });

  it('shifts children up to reveal the newest content', () => {
    const root = createVTNode('element', 'scroll');
    root.styles.set('overflow', 'scroll');
    root.styles.set('flexDirection', 'column');
    root.styles.set('width', 20);
    root.styles.set('height', 2);

    const a = createVTNode('text');
    a.textContent = 'aaa bbb ccc ddd eee fff ggg hhh';
    a.styles.set('wrap', 'wrap');
    const b = createVTNode('text');
    b.textContent = 'xxx yyy zzz www vvv uuu ttt sss';
    b.styles.set('wrap', 'wrap');
    appendVTChild(root, a);
    appendVTChild(root, b);

    const result = layout.calculate(root, 20, 2);

    // Content height 4 vs viewport 2 → scrollTop 2; the last child (y=2) is
    // shifted to the viewport bottom (y=0), fully visible.
    expect(result.vtNode.styles.get('scrollTop')).toBe(2);
    expect(result.children[1].y).toBe(0);
    expect(result.children[1].height).toBe(2);
  });

  it('honours an explicit scrollTop clamped to the content range', () => {
    const root = createVTNode('element', 'scroll');
    root.styles.set('overflow', 'scroll');
    root.styles.set('scrollTop', 99);
    root.styles.set('flexDirection', 'column');
    root.styles.set('width', 20);
    root.styles.set('height', 2);

    const a = createVTNode('text');
    a.textContent = 'aaa bbb ccc ddd eee fff ggg hhh';
    a.styles.set('wrap', 'wrap');
    const b = createVTNode('text');
    b.textContent = 'xxx yyy zzz www vvv uuu ttt sss';
    b.styles.set('wrap', 'wrap');
    appendVTChild(root, a);
    appendVTChild(root, b);

    const result = layout.calculate(root, 20, 2);

    // max scrollTop = content(4) - viewport(2) = 2.
    expect(result.vtNode.styles.get('scrollTop')).toBe(2);
  });
});
