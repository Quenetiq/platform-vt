import { describe, it, expect } from 'vitest';
import { vimTranslate, VIM_NAVIGATION } from './vim.presets';
import type { VTKeyEvent } from '../services/input.service';

const ev = (name: string, ctrl = false, meta = false): VTKeyEvent => ({
  name,
  ctrl,
  meta,
  shift: false,
  sequence: '',
});

describe('vimTranslate', () => {
  it('maps navigation keys', () => {
    expect(vimTranslate(ev('j')).name).toBe('down');
    expect(vimTranslate(ev('k')).name).toBe('up');
    expect(vimTranslate(ev('h')).name).toBe('left');
    expect(vimTranslate(ev('l')).name).toBe('right');
  });

  it('passes non-mapped keys through', () => {
    expect(vimTranslate(ev('return')).name).toBe('return');
    expect(vimTranslate(ev('escape')).name).toBe('escape');
    expect(vimTranslate(ev(' ')).name).toBe(' ');
  });

  it('never translates modified keys', () => {
    expect(vimTranslate(ev('j', true)).name).toBe('j');
    expect(vimTranslate(ev('j', false, true)).name).toBe('j');
  });

  it('supports custom maps', () => {
    const map = { j: 'next', k: 'prev' };
    expect(vimTranslate(ev('j'), map).name).toBe('next');
    expect(vimTranslate(ev('h'), map).name).toBe('h');
  });

  it('exposes the default map', () => {
    expect(VIM_NAVIGATION).toEqual({ j: 'down', k: 'up', h: 'left', l: 'right' });
  });
});