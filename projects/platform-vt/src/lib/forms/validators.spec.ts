import { describe, it, expect } from 'vitest';
import { compose, required, minLength, maxLength, pattern, email, min, max, equals } from './validators';

describe('validators', () => {
  it('required rejects empty and whitespace-only values', () => {
    expect(required()('')).toBe('This field is required');
    expect(required()('   ')).toBe('This field is required');
    expect(required()('x')).toBeNull();
  });

  it('minLength / maxLength', () => {
    expect(minLength(3)('ab')).toBe('Must be at least 3 characters');
    expect(minLength(3)('abc')).toBeNull();
    expect(maxLength(3)('abcd')).toBe('Must be at most 3 characters');
    expect(maxLength(3)('abc')).toBeNull();
  });

  it('pattern', () => {
    expect(pattern(/^\d+$/)('12a')).toBe('Invalid format');
    expect(pattern(/^\d+$/)('123')).toBeNull();
  });

  it('email', () => {
    expect(email()('not-an-email')).toBe('Invalid email address');
    expect(email()('user@example.com')).toBeNull();
  });

  it('min / max numeric', () => {
    expect(min(5)('3')).toBe('Must be >= 5');
    expect(min(5)('7')).toBeNull();
    expect(max(10)('12')).toBe('Must be <= 10');
    expect(max(10)('5')).toBeNull();
    expect(min(5)('abc')).not.toBeNull();
  });

  it('equals', () => {
    expect(equals('secret')('secret')).toBeNull();
    expect(equals('secret')('nope')).toBe('Values do not match');
  });

  it('compose stops at the first failing validator', () => {
    const v = compose(required(), minLength(3), email());
    expect(v('')).toBe('This field is required');
    expect(v('a')).toBe('Must be at least 3 characters');
    expect(v('abc')).toBe('Invalid email address');
    expect(v('a@b.co')).toBeNull();
  });

  it('custom messages', () => {
    expect(required('Name is required')('')).toBe('Name is required');
    expect(pattern(/^\d+$/, 'Digits only')('abc')).toBe('Digits only');
  });
});