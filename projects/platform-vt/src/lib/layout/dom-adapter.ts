export interface DomLayoutNode {
  type: 'element';
  tagName: string;
  textContent: string;
  styles: Map<string, string | number>;
  children: DomLayoutNode[];
}

// Map HTML attribute names to layout engine style names
const ATTR_MAP: Record<string, string> = {
  'flex-direction': 'flexDirection',
  'flexdirection': 'flexDirection',
  'flex-grow': 'flexGrow',
  'flexgrow': 'flexGrow',
  'flex-shrink': 'flexShrink',
  'flexshrink': 'flexShrink',
  'justify-content': 'justifyContent',
  'justifycontent': 'justifyContent',
  'align-items': 'alignItems',
  'alignitems': 'alignItems',
  'align-self': 'alignSelf',
  'alignself': 'alignSelf',
  'text-align': 'textAlign',
  'textalign': 'textAlign',
  'background-color': 'backgroundColor',
  'backgroundcolor': 'backgroundColor',
  'font-weight': 'fontWeight',
  'fontweight': 'fontWeight',
  'font-style': 'fontStyle',
  'fontstyle': 'fontStyle',
  'text-decoration': 'textDecoration',
  'textdecoration': 'textDecoration',
  'min-height': 'minHeight',
  'minheight': 'minHeight',
  'min-width': 'minWidth',
  'minwidth': 'minWidth',
  'max-height': 'maxHeight',
  'maxheight': 'maxHeight',
  'max-width': 'maxWidth',
  'maxwidth': 'maxWidth',
  'flex-basis': 'flexBasis',
  'flexbasis': 'flexBasis',
  'border-left': 'borderLeft',
  'borderleft': 'borderLeft',
  'border-radius': 'borderRadius',
  'borderradius': 'borderRadius',
};

export function readDomLayout(el: Element): DomLayoutNode {
  const styles = new Map<string, string | number>();
  // Only use the explicit 'content' attribute, not inherited textContent from children
  const textContent = el.getAttribute('content') ?? '';

    for (let i = 0; i < el.attributes.length; i++) {
      const attr = el.attributes[i]!;
      const rawName = attr.name;
      const value = attr.value;
      if (rawName.startsWith('_ng') || rawName === 'ng-version' || rawName === 'content') continue;
      if (rawName === 'style') continue;

      const name = ATTR_MAP[rawName] ?? rawName;
      const num = Number(value);
      styles.set(name, Number.isFinite(num) ? num : value);
    }

  // Do NOT parse CSS style attribute — only use explicit HTML attributes set by components

  const children: DomLayoutNode[] = [];
  for (let i = 0; i < el.children.length; i++) {
    children.push(readDomLayout(el.children[i]));
  }

  return { type: 'element', tagName: el.tagName.toLowerCase(), textContent, styles, children };
}
