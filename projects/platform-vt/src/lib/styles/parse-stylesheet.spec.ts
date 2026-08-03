import { describe, it, expect } from 'vitest';
import { parseStylesheet } from './parse-stylesheet';

describe('parseStylesheet', () => {
  it('parses a single rule with one selector', () => {
    const sheet = parseStylesheet('vt-text { color: bright-white; }');
    expect(sheet.rules).toHaveLength(1);
    expect(sheet.rules[0]!.selectors).toEqual(['vt-text']);
    expect(sheet.rules[0]!.styles).toEqual({ color: 'bright-white' });
  });

  it('parses multiple comma-separated selectors', () => {
    const sheet = parseStylesheet('vt-text, vt-caret { color: cyan; }');
    expect(sheet.rules[0]!.selectors).toEqual(['vt-text', 'vt-caret']);
  });

  it('parses the universal selector', () => {
    const sheet = parseStylesheet('* { font-weight: bold; }');
    expect(sheet.rules[0]!.selectors).toEqual(['*']);
  });

  it('maps kebab-case properties to input names', () => {
    const sheet = parseStylesheet('vt-box { background-color: gray; flex-direction: row; }');
    expect(sheet.rules[0]!.styles).toEqual({
      backgroundColor: 'gray',
      flexDirection: 'row',
    });
  });

  it('handles every property in PROPERTY_MAP', () => {
    const sheet = parseStylesheet(
      [
        'vt-box {',
        'flex-direction: column; flex-grow: 1; flex-shrink: 0; flex-basis: auto;',
        'justify-content: center; align-items: flex-end; align-self: center;',
        'text-align: right; min-width: 5; max-width: 80; min-height: 2; max-height: 20;',
        'padding: 1 2; padding-top: 0; padding-right: 1; padding-bottom: 2; padding-left: 3;',
        'margin: 0 1; margin-top: 1; margin-right: 2; margin-bottom: 3; margin-left: 4;',
        'gap: 1; width: 40; height: 5; border: single;',
        'color: red; opacity: dim; white-space: wrap;',
        'font-weight: bold; font-style: italic; text-decoration: underline;',
        '}',
      ].join('\n'),
    );
    const styles = sheet.rules[0]!.styles;
    expect(styles['flexDirection']).toBe('column');
    expect(styles['flexGrow']).toBe(1);
    expect(styles['justifyContent']).toBe('center');
    expect(styles['alignSelf']).toBe('center');
    expect(styles['textAlign']).toBe('right');
    expect(styles['minWidth']).toBe(5);
    expect(styles['maxHeight']).toBe(20);
    expect(styles['padding']).toBe('1 2');
    expect(styles['paddingTop']).toBe(0);
    expect(styles['paddingLeft']).toBe(3);
    expect(styles['margin']).toBe('0 1');
    expect(styles['marginBottom']).toBe(3);
    expect(styles['gap']).toBe(1);
    expect(styles['width']).toBe(40);
    expect(styles['border']).toBe('single');
    expect(styles['opacity']).toBe('dim');
    expect(styles['wrap']).toBe('wrap');
    expect(styles['fontWeight']).toBe('bold');
    expect(styles['textDecoration']).toBe('underline');
  });

  it('converts unknown kebab-case names to camelCase', () => {
    const sheet = parseStylesheet('vt-box { my-custom-prop: 1; }');
    expect(sheet.rules[0]!.styles).toEqual({ myCustomProp: 1 });
  });

  it('handles component-specific appearance properties', () => {
    const sheet = parseStylesheet(
      'vt-caret { glyph: █; } vt-button { variant: secondary; } vt-spinner { type: line; } vt-separator { style: double; }',
    );
    const bySelector = Object.fromEntries(
      sheet.rules.map((r) => [r.selectors[0], r.styles]),
    );
    expect(bySelector['vt-caret']).toEqual({ glyph: '█' });
    expect(bySelector['vt-button']).toEqual({ variant: 'secondary' });
    expect(bySelector['vt-spinner']).toEqual({ type: 'line' });
    expect(bySelector['vt-separator']).toEqual({ style: 'double' });
  });

  it('coerces numeric values to numbers', () => {
    const sheet = parseStylesheet('vt-box { width: 30; height: 2.5; }');
    expect(sheet.rules[0]!.styles).toEqual({ width: 30, height: 2.5 });
  });

  it('ignores block comments', () => {
    const sheet = parseStylesheet(
      '/* header */\nvt-text { color: red; /* inline */ }\n',
    );
    expect(sheet.rules).toHaveLength(1);
    expect(sheet.rules[0]!.styles).toEqual({ color: 'red' });
  });

  it('parses multiple sequential rules', () => {
    const sheet = parseStylesheet(
      'vt-text { color: red; }\nvt-box { background-color: gray; }',
    );
    expect(sheet.rules).toHaveLength(2);
  });

  it('skips rules with invalid selectors or empty bodies', () => {
    const sheet = parseStylesheet('vt-box { } #not-supported { color: red; } .cls { color: blue; }');
    expect(sheet.rules).toHaveLength(1);
    expect(sheet.rules[0]!.selectors).toEqual(['.cls']);
    expect(sheet.rules[0]!.styles).toEqual({ color: 'blue' });
  });

  it('parses class selectors', () => {
    const sheet = parseStylesheet('.block { background-color: #2e2e2e; }');
    expect(sheet.rules).toHaveLength(1);
    expect(sheet.rules[0]!.selectors).toEqual(['.block']);
    expect(sheet.rules[0]!.styles).toEqual({ backgroundColor: '#2e2e2e' });
  });

  it('returns an empty sheet for empty input', () => {
    expect(parseStylesheet('')).toEqual({ rules: [] });
  });

  it('handles declarations spanning multiple lines', () => {
    const sheet = parseStylesheet(
      'vt-text {\n  color: bright-white;\n  opacity: dim;\n}',
    );
    expect(sheet.rules[0]!.styles).toEqual({ color: 'bright-white', opacity: 'dim' });
  });
});
