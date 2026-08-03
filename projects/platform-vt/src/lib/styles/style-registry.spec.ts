import { describe, it, expect } from 'vitest';
import { parseStylesheet } from './parse-stylesheet';
import { StyleRegistry, mergeTheme } from './style-registry';

function createRegistry(source: string): StyleRegistry {
  const registry = new StyleRegistry();
  registry.register(parseStylesheet(source));
  return registry;
}

describe('StyleRegistry', () => {
  it('returns empty styles when nothing is registered', () => {
    const registry = new StyleRegistry();
    expect(registry.get('vt-text')).toEqual({});
  });

  it('merges global and tag-specific styles (tag wins)', () => {
    const registry = createRegistry(
      '* { color: white; }\nvt-text { color: red; }',
    );
    expect(registry.get('vt-text')).toEqual({ color: 'red' });
    expect(registry.get('vt-box')).toEqual({ color: 'white' });
  });

  it('later rules override earlier ones for the same selector', () => {
    const registry = createRegistry(
      'vt-text { color: red; }\nvt-text { color: blue; }',
    );
    expect(registry.get('vt-text')).toEqual({ color: 'blue' });
  });

  it('keeps properties from separate rules for the same selector', () => {
    const registry = createRegistry(
      'vt-text { color: red; }\nvt-text { font-weight: bold; }',
    );
    expect(registry.get('vt-text')).toEqual({ color: 'red', fontWeight: 'bold' });
  });

  it('stores class selectors separately', () => {
    const registry = createRegistry('.block { background-color: #2e2e2e; }');
    expect(registry.getClass('block')).toEqual({
      backgroundColor: '#2e2e2e',
    });
    expect(registry.get('vt-box')).toEqual({});
  });

  it('merges global and class styles (class wins)', () => {
    const registry = createRegistry(
      '* { color: white; }\n.block { background-color: #2e2e2e; }',
    );
    expect(registry.getClass('block')).toEqual({
      color: 'white',
      backgroundColor: '#2e2e2e',
    });
  });

  it('later class rules override earlier ones', () => {
    const registry = createRegistry(
      '.block { background-color: red; }\n.block { background-color: #2e2e2e; }',
    );
    expect(registry.getClass('block')).toEqual({ backgroundColor: '#2e2e2e' });
  });
});

describe('mergeTheme', () => {
  it('returns inputs untouched when there is no registry', () => {
    const out = mergeTheme(null, 'vt-text', {
      color: { value: 'red', default: '' },
    });
    expect(out['color']).toBe('red');
  });

  it('applies theme only to inputs at their default value', () => {
    const registry = createRegistry('vt-text { color: cyan; }');
    const out = mergeTheme(registry, 'vt-text', {
      color: { value: '', default: '' },
    });
    expect(out['color']).toBe('cyan');
  });

  it('lets explicit inputs override the theme', () => {
    const registry = createRegistry('vt-text { color: cyan; }');
    const out = mergeTheme(registry, 'vt-text', {
      color: { value: 'red', default: '' },
    });
    expect(out['color']).toBe('red');
  });

  it('applies theme to inputs equal to their default value', () => {
    const registry = createRegistry('vt-text { font-weight: bold; }');
    const out = mergeTheme(registry, 'vt-text', {
      fontWeight: { value: 'normal', default: 'normal' },
    });
    expect(out['fontWeight']).toBe('bold');
  });

  it('class styles win over tag styles for default inputs', () => {
    const registry = createRegistry(
      'vt-box { background-color: #0a0a0a; }\n.block { background-color: #2e2e2e; }',
    );
    const out = mergeTheme(registry, 'vt-box', {
      backgroundColor: { value: '', default: '' },
    }, ['block']);
    expect(out['backgroundColor']).toBe('#2e2e2e');
  });

  it('class styles never override explicit inputs', () => {
    const registry = createRegistry('.block { background-color: #2e2e2e; }');
    const out = mergeTheme(registry, 'vt-box', {
      backgroundColor: { value: '#111111', default: '' },
    }, ['block']);
    expect(out['backgroundColor']).toBe('#111111');
  });
});
