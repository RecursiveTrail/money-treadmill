import { describe, expect, it } from 'vitest';
import { ledgerLine } from './ledgerText';

describe('ledgerLine', () => {
  it('appends formatted amount when text has no rupee symbol', () => {
    const line = ledgerLine('Salary credited', 100000);
    expect(line).toContain('Salary credited');
    expect(line).toContain('₹1,00,000');
  });

  it('does not append amount when text already includes rupees', () => {
    expect(ledgerLine('SIP ₹30,000', -30000)).toBe('SIP ₹30,000');
  });
});
