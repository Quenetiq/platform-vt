import { PROPERTY_MAP, type VTStyleRule, type VTStyleSheet, type VTStyleValue } from './stylesheet';

/**
 * Parse a CSS-like DSL source string into a {@link VTStyleSheet}.
 *
 * Supported syntax:
 * ```css
 * vt-text, vt-box {
 *   color: bright-white;
 *   background-color: gray;
 * }
 * * {
 *   font-weight: bold;
 * }
 * ```
 *
 * - Block comments (slash-asterisk … asterisk-slash) are removed before parsing.
 * - Selectors may be comma-separated. Tag selectors (`vt-text`), class
 *   selectors (`.msg`), and the universal selector (`*`) are supported.
 * - Declaration names are mapped from kebab-case to component input names
 *   (see {@link PROPERTY_MAP}). Names not in the map fall back to a generic
 *   kebab-case → camelCase conversion, so every possible property is handled.
 *
 * @param source - Raw DSL string.
 * @returns The parsed stylesheet (an empty sheet for empty input).
 */
export function parseStylesheet(source: string): VTStyleSheet {
  const rules: VTStyleRule[] = [];
  const cleaned = stripComments(source);

  const blocks = cleaned.split('}');
  for (const block of blocks) {
    const rule = parseRule(block);
    if (rule) rules.push(rule);
  }

  return { rules };
}

function stripComments(source: string): string {
  let out = '';
  let i = 0;
  while (i < source.length) {
    const rest = source.slice(i);
    const start = rest.indexOf('/*');
    if (start === -1) {
      out += rest;
      break;
    }
    out += rest.slice(0, start);
    const end = rest.indexOf('*/', start + 2);
    if (end === -1) break;
    i += end + 2;
  }
  return out;
}

function parseRule(block: string): VTStyleRule | null {
  const brace = block.indexOf('{');
  if (brace === -1) return null;

  const selectorRaw = block.slice(0, brace);
  const body = block.slice(brace + 1);

  const selectors = selectorRaw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && isValidSelector(s));

  if (selectors.length === 0) return null;

  const styles = parseDeclarations(body);
  if (Object.keys(styles).length === 0) return null;

  return { selectors, styles };
}

function isValidSelector(selector: string): boolean {
  return (
    selector === '*' ||
    /^[a-zA-Z][\w-]*$/.test(selector) ||
    /^\.[a-zA-Z][\w-]*$/.test(selector)
  );
}

function parseDeclarations(body: string): Record<string, VTStyleValue> {
  const styles: Record<string, VTStyleValue> = {};
  const declarations = body.split(';');

  for (const declaration of declarations) {
    const colon = declaration.indexOf(':');
    if (colon === -1) continue;

    const rawName = declaration.slice(0, colon).trim();
    const rawValue = declaration.slice(colon + 1).trim();
    if (rawName.length === 0 || rawValue.length === 0) continue;

    const name = PROPERTY_MAP[rawName] ?? kebabToCamel(rawName);
    styles[name] = coerceValue(rawValue);
  }

  return styles;
}

function kebabToCamel(name: string): string {
  return name.replace(/-([a-z])/g, (_m, c: string) => c.toUpperCase());
}

function coerceValue(value: string): VTStyleValue {
  const trimmed = value.trim();
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed);
  return trimmed;
}
