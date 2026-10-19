import { describe, it, expect } from 'vitest';
import {
  hasControlChars,
  sanitizeHyperlink,
  sanitizeOscPayload,
  sanitizeText,
  MAX_OSC_PAYLOAD,
} from './sanitize';
import { cursor, osc } from './ansi';

describe('sanitizeText', () => {
  it('strips C0/C1 control characters', () => {
    expect(sanitizeText('safe\x1b]52;c;ZXZpbA==\x07')).toBe('safe]52;c;ZXZpbA==');
    expect(sanitizeText('a\tb\nc')).toBe('abc');
    expect(sanitizeText('x\u009by')).toBe('xy');
  });

  it('strips bidi control characters', () => {
    expect(sanitizeText('abc\u202Edef')).toBe('abcdef');
  });

  it('leaves ordinary unicode untouched', () => {
    expect(sanitizeText('Привет 世界 🚀')).toBe('Привет 世界 🚀');
  });
});

describe('sanitizeOscPayload', () => {
  it('replaces control characters with spaces', () => {
    expect(sanitizeOscPayload('a\x07b\x1bc')).toBe('a b c');
  });

  it('truncates long payloads', () => {
    const long = 'x'.repeat(MAX_OSC_PAYLOAD + 100);
    expect(sanitizeOscPayload(long)).toHaveLength(MAX_OSC_PAYLOAD);
  });
});

describe('sanitizeHyperlink', () => {
  it('allows normal URLs', () => {
    expect(sanitizeHyperlink('https://angular.dev')).toBe('https://angular.dev');
    expect(sanitizeHyperlink('mailto:dev@example.com')).toBe('mailto:dev@example.com');
  });

  it('rejects script and data schemes', () => {
    expect(sanitizeHyperlink('javascript:alert(1)')).toBe('');
    expect(sanitizeHyperlink('JAVASCRIPT:alert(1)')).toBe('');
    expect(sanitizeHyperlink('data:text/html,<script>')).toBe('');
    expect(sanitizeHyperlink('vbscript:msgbox(1)')).toBe('');
  });

  it('strips control characters from URLs', () => {
    expect(sanitizeHyperlink('https://example.com/\x07x')).toBe('https://example.com/ x');
  });
});

describe('hasControlChars', () => {
  it('detects control characters', () => {
    expect(hasControlChars('plain')).toBe(false);
    expect(hasControlChars('bad\x1b')).toBe(true);
  });
});

describe('OSC payload sanitization', () => {
  it('does not allow a title to break out of its OSC sequence', () => {
    const sequence = osc.title('evil\x07\x1b]52;c;ZXZpbA==\x07');
    // Only the final BEL terminator is present.
    expect(sequence.indexOf('\x07')).toBe(sequence.length - 1);
    expect(sequence).not.toContain('\x1b]52');
  });

  it('does not allow notifications to inject sequences', () => {
    const sequence = osc.notification('body\x1b]2;owned\x07', 'title\x07');
    expect(sequence.indexOf('\x07')).toBe(sequence.length - 1);
    expect(sequence).not.toContain('\x1b]2');
  });

  it('rejects dangerous hyperlink targets', () => {
    expect(osc.hyperlink('javascript:alert(1)', 'click')).toBe('click');
  });

  it('keeps cursor shape sequences free of user text', () => {
    expect(cursor.shape('bar')).toBe('\x1b[5 q');
  });
});
