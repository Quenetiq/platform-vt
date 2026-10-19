/**
 * Validation primitives for terminal forms.
 *
 * A validator is a pure function `(value) => error message | null`. Compose
 * several with {@link compose}. `FormFieldComponent` runs validators on
 * every value change and exposes the resulting `error` signal.
 */

/** Returns an error message when the value is invalid, or `null` when valid. */
export type ValidatorFn = (value: string) => string | null;

/**
 * Asynchronous validator (e.g. a server-side uniqueness check).
 *
 * Returns a promise resolving to an error message or `null`.
 */
export type AsyncValidatorFn = (value: string) => Promise<string | null>;

/** Combine several async validators; the first failing one produces the error. */
export function composeAsync(...validators: AsyncValidatorFn[]): AsyncValidatorFn {
  return async (value: string): Promise<string | null> => {
    for (const validator of validators) {
      const error = await validator(value);
      if (error !== null) return error;
    }
    return null;
  };
}

/**
 * Debounce an async validator.
 *
 * The wrapped validator is called only after `delayMs` of inactivity; when a
 * newer value arrives first, the pending call is dropped.
 */
export function debouncedAsync(
  validator: AsyncValidatorFn,
  delayMs = 300,
): AsyncValidatorFn {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pending: { resolve: (value: string | null) => void; reject: (reason: unknown) => void } | null =
    null;

  return (value: string): Promise<string | null> =>
    new Promise((resolve, reject) => {
      if (timer) clearTimeout(timer);
      // A superseded call resolves as valid; only the latest value is checked.
      pending?.resolve(null);
      pending = { resolve, reject };
      timer = setTimeout(() => {
        timer = null;
        const current = pending;
        pending = null;
        if (!current) return;
        validator(value).then(current.resolve, current.reject);
      }, Math.max(0, delayMs));
    });
}

/** Combine several validators; the first failing one produces the error. */
export function compose(...validators: ValidatorFn[]): ValidatorFn {
  return (value: string): string | null => {
    for (const validator of validators) {
      const error = validator(value);
      if (error !== null) return error;
    }
    return null;
  };
}

/** The value must be non-empty (after trimming whitespace). */
export const required =
  (message = 'This field is required'): ValidatorFn =>
  (value) =>
    value.trim().length > 0 ? null : message;

/** The value must be at least `min` characters long. */
export const minLength =
  (min: number, message?: string): ValidatorFn =>
  (value) =>
    value.length >= min ? null : (message ?? `Must be at least ${min} characters`);

/** The value must be at most `max` characters long. */
export const maxLength =
  (max: number, message?: string): ValidatorFn =>
  (value) =>
    value.length <= max ? null : (message ?? `Must be at most ${max} characters`);

/** The value must match a regular expression. */
export const pattern =
  (regex: RegExp, message?: string): ValidatorFn =>
  (value) =>
    regex.test(value) ? null : (message ?? 'Invalid format');

/** The value must be a valid email address (pragmatic check). */
export const email = (message = 'Invalid email address'): ValidatorFn =>
  pattern(/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/, message);

/** The value must be a number >= `min`. */
export const min =
  (minValue: number, message?: string): ValidatorFn =>
  (value) => {
    const n = Number(value);
    if (value.trim() === '' || Number.isNaN(n)) return message ?? `Must be a number >= ${minValue}`;
    return n >= minValue ? null : (message ?? `Must be >= ${minValue}`);
  };

/** The value must be a number <= `max`. */
export const max =
  (maxValue: number, message?: string): ValidatorFn =>
  (value) => {
    const n = Number(value);
    if (value.trim() === '' || Number.isNaN(n)) return message ?? `Must be a number <= ${maxValue}`;
    return n <= maxValue ? null : (message ?? `Must be <= ${maxValue}`);
  };

/** The value must equal `expected` (useful for password confirmation). */
export const equals =
  (expected: string, message?: string): ValidatorFn =>
  (value) =>
    value === expected ? null : (message ?? 'Values do not match');
