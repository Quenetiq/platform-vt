/**
 * Type of a virtual terminal node.
 */
export type VTNodeType = 'element' | 'text' | 'comment' | 'root';

/**
 * A rectangle representing a node's position and size after layout.
 */
export interface LayoutRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * A virtual terminal node — the fundamental building block of the VT tree.
 *
 * Analogous to a DOM node, but for terminal rendering. Components are
 * mapped to VTNodes by the Angular renderer, then laid out by the
 * flexbox engine and rendered to ANSI escape sequences.
 */
export interface VTNode {
  /** Unique auto-incrementing ID. */
  readonly id: number;
  /** Node type: `'element'`, `'text'`, `'comment'`, or `'root'`. */
  readonly type: VTNodeType;
  /** Tag name (e.g., `'vt-box'`, `'vt-text'`). */
  tagName: string;
  /** Parent node, or null for the root. */
  parent: VTNode | null;
  /** Child nodes. */
  children: VTNode[];
  /** Previous sibling, or null. */
  previousSibling: VTNode | null;
  /** Next sibling, or null. */
  nextSibling: VTNode | null;
  /** HTML-style attributes. */
  attributes: Map<string, string>;
  /** CSS-like class set. */
  classes: Set<string>;
  /** Inline styles (string or number values). */
  styles: Map<string, string | number>;
  /** Arbitrary properties. */
  properties: Map<string, unknown>;
  /** Text content for text nodes. */
  textContent: string;
  /** Comment content for comment nodes. */
  commentContent: string;
  /** Cached layout rectangle, or null if not yet laid out. */
  layout: LayoutRect | null;
  /** Whether this node needs re-layout. */
  dirty: boolean;
}

let nextId = 0;

/**
 * Create a new VTNode of the given type.
 *
 * @param type - The node type.
 * @param tagName - Optional tag name for element nodes.
 * @returns A new VTNode with default values.
 *
 * @example
 * ```typescript
 * const root = createVTNode('root', 'root');
 * const text = createVTNode('text');
 * text.textContent = 'Hello';
 * ```
 */
export function createVTNode(type: VTNodeType, tagName?: string): VTNode {
  return {
    id: nextId++,
    type,
    tagName: tagName ?? '',
    parent: null,
    children: [],
    previousSibling: null,
    nextSibling: null,
    attributes: new Map(),
    classes: new Set(),
    styles: new Map(),
    properties: new Map(),
    textContent: '',
    commentContent: '',
    layout: null,
    dirty: true,
  };
}

/**
 * Append a child node to a parent. Removes the child from its
 * current parent if already attached elsewhere.
 *
 * @param parent - The parent node.
 * @param child - The child node to append.
 */
export function appendVTChild(parent: VTNode, child: VTNode): void {
  if (child.parent) {
    removeVTChild(child.parent, child);
  }

  child.parent = parent;
  child.previousSibling = parent.children[parent.children.length - 1] ?? null;
  child.nextSibling = null;

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (child.previousSibling) {
    child.previousSibling.nextSibling = child;
  }

  parent.children.push(child);
  markDirty(parent);
}

/**
 * Insert a child node before a reference child.
 *
 * @param parent - The parent node.
 * @param newChild - The child to insert.
 * @param refChild - The reference child (must be a child of parent).
 * @throws {Error} If refChild is not a child of parent.
 */
export function insertVTBefore(
  parent: VTNode,
  newChild: VTNode,
  refChild: VTNode,
): void {
  if (refChild.parent !== parent) {
    throw new Error('refChild is not a child of parent');
  }

  if (newChild.parent) {
    removeVTChild(newChild.parent, newChild);
  }

  const index = parent.children.indexOf(refChild);

  newChild.parent = parent;
  newChild.previousSibling = parent.children[index - 1] ?? null;
  newChild.nextSibling = refChild;

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (newChild.previousSibling) {
    newChild.previousSibling.nextSibling = newChild;
  }
  refChild.previousSibling = newChild;

  parent.children.splice(index, 0, newChild);
  markDirty(parent);
}

/**
 * Remove a child node from its parent.
 *
 * @param parent - The parent node.
 * @param child - The child node to remove.
 */
export function removeVTChild(parent: VTNode | null, child: VTNode): void {
  if (!parent) return;
  const index = parent.children.indexOf(child);
  if (index === -1) return;

  if (child.previousSibling) {
    child.previousSibling.nextSibling = child.nextSibling;
  }
  if (child.nextSibling) {
    child.nextSibling.previousSibling = child.previousSibling;
  }

  parent.children.splice(index, 1);
  child.parent = null;
  child.previousSibling = null;
  child.nextSibling = null;
  markDirty(parent);
}

function markDirty(node: VTNode): void {
  let current: VTNode | null = node;
  while (current && !current.dirty) {
    current.dirty = true;
    current = current.parent;
  }
}

/**
 * Reset the VTNode ID counter. Useful for testing.
 */
export function resetVTNodeId(): void {
  nextId = 0;
}
