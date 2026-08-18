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

describe('FlexLayout absolute positioning', () => {
  const layout = new FlexLayout();

  it('places an absolute child at left/top without disturbing the flow', () => {
    const root = createVTNode('root');
    root.styles.set('flexDirection', 'column');
    root.styles.set('width', 40);
    root.styles.set('height', 20);

    const flow = createVTNode('text');
    flow.textContent = 'in-flow';
    const abs = createVTNode('text');
    abs.textContent = 'overlay';
    abs.styles.set('position', 'absolute');
    abs.styles.set('left', 10);
    abs.styles.set('top', 5);
    appendVTChild(root, flow);
    appendVTChild(root, abs);

    const result = layout.calculate(root, 40, 20);

    expect(result.children.length).toBe(2);
    // In-flow child keeps its natural position (not pushed by the absolute one).
    expect(result.children[0].x).toBe(0);
    expect(result.children[0].y).toBe(0);
    // Absolute child sits at (10, 5) with content width.
    expect(result.children[1].x).toBe(10);
    expect(result.children[1].y).toBe(5);
    expect(result.children[1].width).toBe(7);
    expect(result.children[1].height).toBe(1);
  });

  it('measures the natural size of an absolute container with children', () => {
    const root = createVTNode('root');
    root.styles.set('width', 80);
    root.styles.set('height', 24);

    const panel = createVTNode('element', 'vt-overlay-panel');
    panel.styles.set('position', 'absolute');
    panel.styles.set('left', 2);
    panel.styles.set('top', 3);
    panel.styles.set('padding', 1);
    const text = createVTNode('text');
    text.textContent = 'hint';
    appendVTChild(panel, text);
    appendVTChild(root, panel);

    const result = layout.calculate(root, 80, 24);
    const node = result.children[0]!;

    // 1 padding each side + 4 content columns, 1 + 1 + 1 rows.
    expect(node.x).toBe(2);
    expect(node.y).toBe(3);
    expect(node.width).toBe(6);
    expect(node.height).toBe(3);
    expect(node.children.length).toBe(1);
    expect(node.children[0]!.x).toBe(3);
    expect(node.children[0]!.y).toBe(4);
  });

  it('uses explicit width/height for absolute children', () => {
    const root = createVTNode('root');
    root.styles.set('width', 80);
    root.styles.set('height', 24);

    const abs = createVTNode('element', 'vt-overlay-panel');
    abs.styles.set('position', 'absolute');
    abs.styles.set('left', 4);
    abs.styles.set('top', 6);
    abs.styles.set('width', 20);
    abs.styles.set('height', 3);
    appendVTChild(root, abs);

    const result = layout.calculate(root, 80, 24);
    const node = result.children[0]!;

    expect(node.x).toBe(4);
    expect(node.y).toBe(6);
    expect(node.width).toBe(20);
    expect(node.height).toBe(3);
  });

  it('clamps an absolute child to the containing box', () => {
    const root = createVTNode('root');
    root.styles.set('width', 10);
    root.styles.set('height', 5);

    const abs = createVTNode('text');
    abs.textContent = 'tooltip-text';
    abs.styles.set('position', 'absolute');
    abs.styles.set('left', 8);
    abs.styles.set('top', 4);
    appendVTChild(root, abs);

    const result = layout.calculate(root, 10, 5);
    const node = result.children[0]!;

    // Content width is capped at 10 - 8 = 2 columns.
    expect(node.x).toBe(8);
    expect(node.y).toBe(4);
    expect(node.width).toBe(2);
  });

  it('ignores absolute children in grow/shrink distribution', () => {
    const root = createVTNode('root');
    root.styles.set('flexDirection', 'row');
    root.styles.set('width', 20);
    root.styles.set('height', 3);

    const grow = createVTNode('element', 'vt-box');
    grow.styles.set('flexGrow', 1);
    const abs = createVTNode('text');
    abs.textContent = 'B';
    abs.styles.set('position', 'absolute');
    abs.styles.set('left', 0);
    abs.styles.set('top', 0);
    appendVTChild(root, grow);
    appendVTChild(root, abs);

    const result = layout.calculate(root, 20, 3);

    // The in-flow child gets all 20 columns; the absolute one is not counted.
    expect(result.children[0].width).toBe(20);
    expect(result.children[1].x).toBe(0);
    expect(result.children[1].y).toBe(0);
  });

  it('paints absolute children after in-flow ones (on top)', () => {
    const root = createVTNode('root');
    root.styles.set('width', 20);
    root.styles.set('height', 5);

    const flow = createVTNode('text');
    flow.textContent = 'under';
    const abs = createVTNode('text');
    abs.textContent = 'over';
    abs.styles.set('position', 'absolute');
    abs.styles.set('left', 0);
    abs.styles.set('top', 0);
    appendVTChild(root, flow);
    appendVTChild(root, abs);

    const result = layout.calculate(root, 20, 5);

    // Order in children mirrors DOM order; rendering paints in that order.
    expect(result.children.map((c) => c.vtNode)).toEqual([flow, abs]);
  });
});
