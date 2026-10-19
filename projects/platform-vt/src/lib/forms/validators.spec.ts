import { describe, it, expect } from 'vitest';
import {
  compose,
  composeAsync,
  debouncedAsync,
  required,
  minLength,
  maxLength,
  pattern,
  email,
  min,
  max,
  equals,
} from './validators';

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

  it('composeAsync stops at the first failing async validator', async () => {
    const v = composeAsync(
      (value: string): Promise<string | null> =>
        Promise.resolve(value.length < 3 ? 'too short' : null),
      (value: string): Promise<string | null> =>
        Promise.resolve(value === 'taken' ? 'taken' : null),
    );
    await expect(v('ab')).resolves.toBe('too short');
    await expect(v('taken')).resolves.toBe('taken');
    await expect(v('okay')).resolves.toBeNull();
  });

  it('debouncedAsync only runs the latest value', async () => {
    const calls: string[] = [];
    const v = debouncedAsync((value: string): Promise<string | null> => {
      calls.push(value);
      return Promise.resolve(null);
    }, 5);

    const first = v('a');
    const second = v('b');
    await Promise.all([first, second]);
    expect(calls).toEqual(['b']);
  });
});
