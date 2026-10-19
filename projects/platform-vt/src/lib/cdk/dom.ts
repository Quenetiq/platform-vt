/**
 * DOM helpers shared by the terminal components (the library's "CDK").
 *
 * Components render by building a tree of plain elements with vt-* style
 * attributes; the layout engine reads the attributes directly. These helpers
 * keep that DOM plumbing small and consistent.
 */

/**
 * Create a monotonic id generator, e.g. `createIdGenerator('vt-box')`.
 *
 * Components use unique ids for focus/click/wheel registration:
 * `private readonly id = nextId('vt-input')`.
 */
export function createIdGenerator(prefix: string): () => string {
  let counter = 0;
  return () => `${prefix}-${String(counter++)}`;
}

/**
 * Set the text of a rendered element: both the text node and the `content`
 * attribute the layout engine measures.
 */
export function setCellText(el: HTMLElement, text: string): void {
  el.textContent = text;
  el.setAttribute('content', text);
}

/**
 * Set a style attribute (removing it when the value is empty/falsy).
 */
export function setStyleAttr(el: HTMLElement, name: string, value: string | undefined): void {
  if (value) el.setAttribute(name, value);
  else el.removeAttribute(name);
}

/**
 * Bring `el.children` to exactly `count` elements of `tagName`, creating or
 * removing rows as needed. Returns the (re)created children.
 */
export function syncChildren(
  el: HTMLElement,
  count: number,
  tagName: string,
  baseAttrs: Record<string, string> = {},
): HTMLElement[] {
  while (el.children.length < count) {
    const row = document.createElement(tagName);
    for (const [name, value] of Object.entries(baseAttrs)) {
      row.setAttribute(name, value);
    }
    el.appendChild(row);
  }
  while (el.children.length > count) {
    el.lastElementChild?.remove();
  }
  return Array.from(el.children) as HTMLElement[];
}

/** Row attributes every rendered line element shares. */
export const LINE_ATTRS: Record<string, string> = {
  display: 'flex',
  'flex-direction': 'row',
  'flex-shrink': '0',
  'min-height': '1',
};

/** Column/container attributes for stacked lists. */
export const COLUMN_ATTRS: Record<string, string> = {
  display: 'flex',
  'flex-direction': 'column',
  'flex-shrink': '0',
};
