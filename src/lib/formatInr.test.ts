import { describe, expect, it } from 'vitest';
import { formatInr } from './formatInr';

describe('formatInr', () => {
  it('groups the last three digits, then pairs', () => {
    expect(formatInr(100000)).toBe('₹1,00,000');
    expect(formatInr(40_00_000)).toBe('₹40,00,000');
    expect(formatInr(500)).toBe('₹500');
    expect(formatInr(0)).toBe('₹0');
    expect(formatInr(-36000)).toBe('-₹36,000');
  });
});
