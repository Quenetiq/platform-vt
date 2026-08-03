import { describe, it, expect, beforeEach } from 'vitest';
import { FlexLayout } from '../layout/flex-layout';
import { createVTNode, appendVTChild, resetVTNodeId } from '../renderer/vt-node';
import { hitTestClickable } from './click.service';

const CLICK_ATTR = 'vt-click-id';

beforeEach(() => {
  resetVTNodeId();
});

describe('hitTestClickable', () => {
  it('finds a clickable button under the cursor', () => {
    const root = createVTNode('root');
    root.styles.set('width', 40);
    root.styles.set('height', 10);

    const button = createVTNode('element', 'vt-button');
    button.styles.set(CLICK_ATTR, 'b1');
    button.styles.set('width', 10);
    button.styles.set('align-self', 'flex-start');
    appendVTChild(root, button);

    const layout = new FlexLayout().calculate(root, 40, 10);

    expect(hitTestClickable(layout, 2, 1, CLICK_ATTR)?.vtNode).toBe(button);
    expect(hitTestClickable(layout, 9, 9, CLICK_ATTR)?.vtNode).toBe(button);
    expect(hitTestClickable(layout, 15, 1, CLICK_ATTR)).toBeNull();
    expect(hitTestClickable(layout, 39, 9, CLICK_ATTR)).toBeNull();
  });

  it('prefers the innermost clickable element', () => {
    const root = createVTNode('root');
    root.styles.set('width', 20);
    root.styles.set('height', 10);

    const outer = createVTNode('element');
    outer.styles.set(CLICK_ATTR, 'outer');
    outer.styles.set('width', 20);

    const inner = createVTNode('element');
    inner.styles.set(CLICK_ATTR, 'inner');
    inner.styles.set('width', 5);
    appendVTChild(outer, inner);
    appendVTChild(root, outer);

    const layout = new FlexLayout().calculate(root, 20, 10);

    expect(hitTestClickable(layout, 1, 0, CLICK_ATTR)?.vtNode.styles.get(CLICK_ATTR)).toBe('inner');
    expect(hitTestClickable(layout, 10, 0, CLICK_ATTR)?.vtNode.styles.get(CLICK_ATTR)).toBe('outer');
  });

  it('falls back to a clickable ancestor when the child is not clickable', () => {
    const root = createVTNode('root');
    root.styles.set('width', 20);
    root.styles.set('height', 10);

    const outer = createVTNode('element');
    outer.styles.set(CLICK_ATTR, 'outer');
    outer.styles.set('width', 20);

    const plain = createVTNode('element');
    plain.styles.set('width', 10);
    appendVTChild(outer, plain);
    appendVTChild(root, outer);

    const layout = new FlexLayout().calculate(root, 20, 10);

    expect(hitTestClickable(layout, 3, 0, CLICK_ATTR)?.vtNode.styles.get(CLICK_ATTR)).toBe('outer');
  });
});
