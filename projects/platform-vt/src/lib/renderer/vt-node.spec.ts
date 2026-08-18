import { describe, it, expect, beforeEach } from 'vitest';
import {
  createVTNode,
  appendVTChild,
  insertVTBefore,
  removeVTChild,
  resetVTNodeId,
} from './vt-node';

beforeEach(() => {
  resetVTNodeId();
});

describe('createVTNode', () => {
  it('creates a node with default values', () => {
    const node = createVTNode('element', 'vt-box');
    expect(node.type).toBe('element');
    expect(node.tagName).toBe('vt-box');
    expect(node.parent).toBeNull();
    expect(node.children).toEqual([]);
    expect(node.previousSibling).toBeNull();
    expect(node.nextSibling).toBeNull();
    expect(node.attributes.size).toBe(0);
    expect(node.classes.size).toBe(0);
    expect(node.styles.size).toBe(0);
    expect(node.properties.size).toBe(0);
    expect(node.textContent).toBe('');
    expect(node.commentContent).toBe('');
    expect(node.layout).toBeNull();
    expect(node.dirty).toBe(true);
  });

  it('defaults tagName to empty string', () => {
    expect(createVTNode('text').tagName).toBe('');
  });

  it('assigns unique incrementing ids', () => {
    const a = createVTNode('root');
    const b = createVTNode('text');
    expect(b.id).toBe(a.id + 1);
  });

  it('resets the id counter', () => {
    createVTNode('root');
    resetVTNodeId();
    expect(createVTNode('root').id).toBe(0);
  });
});

describe('appendVTChild', () => {
  it('appends a child and links siblings', () => {
    const parent = createVTNode('root');
    const a = createVTNode('text');
    const b = createVTNode('text');
    appendVTChild(parent, a);
    appendVTChild(parent, b);

    expect(parent.children).toEqual([a, b]);
    expect(a.parent).toBe(parent);
    expect(b.parent).toBe(parent);
    expect(a.previousSibling).toBeNull();
    expect(a.nextSibling).toBe(b);
    expect(b.previousSibling).toBe(a);
    expect(b.nextSibling).toBeNull();
  });

  it('marks the parent and ancestors dirty', () => {
    const grandparent = createVTNode('root');
    const parent = createVTNode('element');
    appendVTChild(grandparent, parent);
    grandparent.dirty = false;
    parent.dirty = false;

    appendVTChild(parent, createVTNode('text'));

    expect(parent.dirty).toBe(true);
    expect(grandparent.dirty).toBe(true);
  });

  it('removes the child from a previous parent first', () => {
    const oldParent = createVTNode('root');
    const newParent = createVTNode('root');
    const child = createVTNode('text');
    const sibling = createVTNode('text');

    appendVTChild(oldParent, child);
    appendVTChild(oldParent, sibling);

    appendVTChild(newParent, child);

    expect(oldParent.children).toEqual([sibling]);
    expect(sibling.previousSibling).toBeNull();
    expect(sibling.nextSibling).toBeNull();
    expect(newParent.children).toEqual([child]);
    expect(child.parent).toBe(newParent);
  });
});

describe('insertVTBefore', () => {
  it('inserts the new child before the reference child', () => {
    const parent = createVTNode('root');
    const a = createVTNode('text');
    const b = createVTNode('text');
    const c = createVTNode('text');
    appendVTChild(parent, a);
    appendVTChild(parent, c);

    insertVTBefore(parent, b, c);

    expect(parent.children).toEqual([a, b, c]);
    expect(a.nextSibling).toBe(b);
    expect(b.previousSibling).toBe(a);
    expect(b.nextSibling).toBe(c);
    expect(c.previousSibling).toBe(b);
  });

  it('inserts at the beginning when there is no previous sibling', () => {
    const parent = createVTNode('root');
    const a = createVTNode('text');
    const b = createVTNode('text');
    appendVTChild(parent, a);

    insertVTBefore(parent, b, a);

    expect(parent.children).toEqual([b, a]);
    expect(b.previousSibling).toBeNull();
    expect(a.previousSibling).toBe(b);
  });

  it('throws when refChild is not a child of parent', () => {
    const parent = createVTNode('root');
    const other = createVTNode('root');
    const ref = createVTNode('text');
    appendVTChild(other, ref);

    expect(() => insertVTBefore(parent, createVTNode('text'), ref)).toThrow(
      'refChild is not a child of parent',
    );
  });
});

describe('removeVTChild', () => {
  it('removes the child and relinks siblings', () => {
    const parent = createVTNode('root');
    const a = createVTNode('text');
    const b = createVTNode('text');
    const c = createVTNode('text');
    appendVTChild(parent, a);
    appendVTChild(parent, b);
    appendVTChild(parent, c);

    removeVTChild(parent, b);

    expect(parent.children).toEqual([a, c]);
    expect(a.nextSibling).toBe(c);
    expect(c.previousSibling).toBe(a);
    expect(b.parent).toBeNull();
    expect(b.previousSibling).toBeNull();
    expect(b.nextSibling).toBeNull();
  });

  it('does nothing when parent is null or child is absent', () => {
    const parent = createVTNode('root');
    const child = createVTNode('text');
    const stranger = createVTNode('text');

    expect(() => removeVTChild(null, child)).not.toThrow();
    expect(() => removeVTChild(parent, stranger)).not.toThrow();
    expect(parent.children).toEqual([]);
    expect(stranger.parent).toBeNull();
  });
});