import { describe, it, expect } from 'vitest';
import {
  resolveColor,
  wrapColor,
  resolveColorRgb,
  wrapColorRgb,
} from './color-map';

describe('resolveColor', () => {
  it('resolves named fg colors', () => {
    expect(resolveColor('red', 'fg')).toBe('\x1b[31m');
    expect(resolveColor('green', 'fg')).toBe('\x1b[32m');
    expect(resolveColor('blue', 'fg')).toBe('\x1b[34m');
  });

  it('resolves named bg colors', () => {
    expect(resolveColor('red', 'bg')).toBe('\x1b[41m');
    expect(resolveColor('green', 'bg')).toBe('\x1b[42m');
  });

  it('resolves bright fg colors', () => {
    expect(resolveColor('bright-red', 'fg')).toBe('\x1b[91m');
  });

  it('resolves bright bg colors', () => {
    expect(resolveColor('bright-blue', 'bg')).toBe('\x1b[104m');
  });

  it('returns null for unknown color', () => {
    expect(resolveColor('purple', 'fg')).toBeNull();
  });

  it('is case insensitive', () => {
    expect(resolveColor('Red', 'fg')).toBe('\x1b[31m');
    expect(resolveColor('RED', 'bg')).toBe('\x1b[41m');
  });

  it('resolves grey as alias for gray', () => {
    expect(resolveColor('grey', 'fg')).toBe(resolveColor('gray', 'fg'));
  });

  it('resolves hex colors as 24-bit RGB', () => {
    expect(resolveColor('#2e2e2e', 'bg')).toBe('\x1b[48;2;46;46;46m');
  });

  it('resolves rgb() colors as 24-bit RGB', () => {
    expect(resolveColor('rgb(255, 255, 255)', 'fg')).toBe(
      '\x1b[38;2;255;255;255m',
    );
  });
});

describe('wrapColor', () => {
  it('wraps text with color codes', () => {
    expect(wrapColor('hello', 'red', 'fg')).toBe('\x1b[31mhello\x1b[39m');
  });

  it('returns original text for unknown color', () => {
    expect(wrapColor('hello', 'unknown', 'fg')).toBe('hello');
  });

  it('wraps with bg color', () => {
    expect(wrapColor('hello', 'blue', 'bg')).toBe('\x1b[44mhello\x1b[49m');
  });
});

describe('resolveColorRgb', () => {
  it('resolves named fg colors to 24-bit RGB', () => {
    expect(resolveColorRgb('bright-white', 'fg')).toBe(
      '\x1b[38;2;255;255;255m',
    );
    expect(resolveColorRgb('red', 'fg')).toBe('\x1b[38;2;205;49;49m');
  });

  it('resolves named bg colors to 24-bit RGB', () => {
    expect(resolveColorRgb('gray', 'bg')).toBe('\x1b[48;2;105;105;105m');
  });

  it('resolves hex colors', () => {
    expect(resolveColorRgb('#2e2e2e', 'bg')).toBe('\x1b[48;2;46;46;46m');
    expect(resolveColorRgb('#fff', 'fg')).toBe('\x1b[38;2;255;255;255m');
    expect(resolveColorRgb('#0a0a0a', 'bg')).toBe('\x1b[48;2;10;10;10m');
  });

  it('resolves rgb() colors', () => {
    expect(resolveColorRgb('rgb(139, 139, 139)', 'fg')).toBe(
      '\x1b[38;2;139;139;139m',
    );
  });

  it('returns null for unknown color', () => {
    expect(resolveColorRgb('purple', 'fg')).toBeNull();
    expect(resolveColorRgb('#ggg', 'fg')).toBeNull();
  });

  it('is case insensitive', () => {
    expect(resolveColorRgb('Bright-White', 'fg')).toBe(
      '\x1b[38;2;255;255;255m',
    );
    expect(resolveColorRgb('#2E2E2E', 'bg')).toBe('\x1b[48;2;46;46;46m');
  });

  it('resolves grey as alias for gray', () => {
    expect(resolveColorRgb('grey', 'bg')).toBe(
      resolveColorRgb('gray', 'bg'),
    );
  });
});

describe('wrapColorRgb', () => {
  it('wraps text with 24-bit RGB codes', () => {
    expect(wrapColorRgb('hello', 'bright-white', 'fg')).toBe(
      '\x1b[38;2;255;255;255mhello\x1b[39m',
    );
  });

  it('returns original text for unknown color', () => {
    expect(wrapColorRgb('hello', 'unknown', 'fg')).toBe('hello');
  });

  it('wraps with bg color', () => {
    expect(wrapColorRgb('hello', 'gray', 'bg')).toBe(
      '\x1b[48;2;105;105;105mhello\x1b[49m',
    );
  });
});
