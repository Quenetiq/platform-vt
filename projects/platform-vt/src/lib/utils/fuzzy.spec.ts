import { describe, it, expect } from 'vitest';
import { fuzzyMatch, fuzzyRank } from './fuzzy';

describe('fuzzyMatch', () => {
  it('matches exact subsequences', () => {
    expect(fuzzyMatch('del', 'Delete')).not.toBeNull();
    expect(fuzzyMatch('dlt', 'Delete')).not.toBeNull();
  });

  it('returns null when characters are missing or out of order', () => {
    expect(fuzzyMatch('xyz', 'Delete')).toBeNull();
    expect(fuzzyMatch('dli', 'Delete')).toBeNull(); // i before e in query but after in text
  });

  it('is case-insensitive', () => {
    expect(fuzzyMatch('DEL', 'Delete')).not.toBeNull();
    expect(fuzzyMatch('save', 'SAVE FILE')).not.toBeNull();
  });

  it('scores consecutive runs higher', () => {
    const consecutive = fuzzyMatch('del', 'Delete')!;
    const spread = fuzzyMatch('dlt', 'Delete')!;
    expect(consecutive).toBeGreaterThan(spread);
  });

  it('scores word-boundary matches higher', () => {
    const boundary = fuzzyMatch('sf', 'Save File')!;
    const middle = fuzzyMatch('sf', 'asdf ghj')!;
    expect(boundary).toBeGreaterThan(middle);
  });

  it('treats empty query as matching everything', () => {
    expect(fuzzyMatch('', 'anything')).toBe(0);
  });
});

describe('fuzzyRank', () => {
  it('returns only matching texts sorted by score', () => {
    const ranked = fuzzyRank('del', ['Delete file', 'Deploy', 'Edit', 'Delete'], 10);
    // 'Delete' and 'Delete file' tie on score; ties break alphabetically.
    expect(ranked).toEqual(['Delete', 'Delete file', 'Deploy']);
  });

  it('respects the limit', () => {
    const ranked = fuzzyRank('a', ['aa', 'ab', 'ac', 'ad', 'ae', 'af', 'ag', 'ah', 'ai', 'aj', 'ak'], 5);
    expect(ranked.length).toBe(5);
  });

  it('returns all texts for an empty query', () => {
    const ranked = fuzzyRank('', ['b', 'a', 'c']);
    expect(ranked).toEqual(['a', 'b', 'c']);
  });
});