import { describe, it, expect } from 'vitest';
import { resolveColorAdaptive, rgbTo256, rgbToNearest16 } from './color-map';

describe('rgbTo256', () => {
  it('maps grays to the grayscale ramp', () => {
    expect(rgbTo256(0, 0, 0)).toBe(16);
    expect(rgbTo256(255, 255, 255)).toBe(231);
  });

  it('maps cube colors', () => {
    // Pure red (255,0,0) → cube index (5,0,0) → 16 + 36*5
    expect(rgbTo256(255, 0, 0)).toBe(196);
    // Pure green (0,255,0) → (0,5,0) → 16 + 6*5
    expect(rgbTo256(0, 255, 0)).toBe(46);
  });
});

describe('rgbToNearest16', () => {
  it('maps pure colors to their ANSI index', () => {
    expect(rgbToNearest16(255, 0, 0)).toBe(1); // red
    expect(rgbToNearest16(0, 255, 0)).toBe(2); // green
    expect(rgbToNearest16(0, 0, 0)).toBe(0); // black
    expect(rgbToNearest16(255, 255, 255)).toBe(15); // bright-white
  });
});

describe('resolveColorAdaptive', () => {
  it('emits 24-bit codes in truecolor mode', () => {
    expect(resolveColorAdaptive('#ff8800', 'fg', 'truecolor')).toBe('\x1b[38;2;255;136;0m');
  });

  it('snaps arbitrary colors to the 256 palette', () => {
    expect(resolveColorAdaptive('#ff0000', 'fg', 256)).toBe('\x1b[38;5;196m');
  });

  it('snaps arbitrary colors to the nearest basic color in 16 mode', () => {
    expect(resolveColorAdaptive('#ff0000', 'fg', 16)).toBe('\x1b[31m');
  });

  it('supports explicit 256:<index> names', () => {
    expect(resolveColorAdaptive('256:42', 'fg', 256)).toBe('\x1b[38;5;42m');
    expect(resolveColorAdaptive('256:42', 'bg', 'truecolor')).toBe('\x1b[48;5;42m');
  });

  it('resolves named colors through the standard palette', () => {
    expect(resolveColorAdaptive('red', 'fg', 16)).toBe('\x1b[31m');
    expect(resolveColorAdaptive('bright-blue', 'bg', 'truecolor')).toBe('\x1b[48;2;140;180;255m');
  });

  it('returns null for unknown colors', () => {
    expect(resolveColorAdaptive('not-a-color', 'fg', 'truecolor')).toBeNull();
  });
});