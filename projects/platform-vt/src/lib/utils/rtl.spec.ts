import { describe, it, expect } from 'vitest';
import { hasRtl, flipRtlRuns } from './rtl';

describe('hasRtl', () => {
  it('detects Hebrew and Arabic text', () => {
    expect(hasRtl('שלום עולם')).toBe(true);
    expect(hasRtl('مرحبا')).toBe(true);
    expect(hasRtl('hello world')).toBe(false);
    expect(hasRtl('hello שלום')).toBe(true);
  });
});

describe('flipRtlRuns', () => {
  it('reverses a pure RTL string', () => {
    expect(flipRtlRuns('שלום')).toBe('םולש');
  });

  it('keeps the gap before following LTR text', () => {
    expect(flipRtlRuns('שלום world')).toBe('םולש world');
  });

  it('keeps digit sequences in place inside an RTL run', () => {
    expect(flipRtlRuns('مرحبا 123')).toBe('ابحرم 123');
    expect(flipRtlRuns('שלום 123 עולם')).toBe('םולש 123 םלוע');
  });

  it('joins trailing punctuation into the reversed run', () => {
    expect(flipRtlRuns('שלום!')).toBe('!םולש');
  });

  it('leaves LTR text untouched', () => {
    expect(flipRtlRuns('plain text')).toBe('plain text');
  });
});
