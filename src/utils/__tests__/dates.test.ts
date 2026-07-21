import { describe, expect, it } from 'vitest';
import { getLocalDateInputValue } from '../dates';

describe('getLocalDateInputValue', () => {
  it('uses local calendar parts instead of converting through UTC', () => {
    expect(getLocalDateInputValue(new Date(2026, 6, 21, 0, 30))).toBe('2026-07-21');
  });
});
