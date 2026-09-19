import { describe, expect, it } from 'vitest';
import { DEFAULT_SETUP } from './defaults';
import { validateSetup } from './validate';

describe('validateSetup', () => {
  it('accepts defaults', () => {
    expect(validateSetup(DEFAULT_SETUP)).toEqual([]);
  });

  it('rejects non-integer start age', () => {
    expect(validateSetup({ ...DEFAULT_SETUP, startAgeYears: 25.5 }).length).toBeGreaterThan(0);
  });

  it('rejects retirement at or before start age', () => {
    expect(validateSetup({ ...DEFAULT_SETUP, targetRetirementAge: 25 }).length).toBeGreaterThan(0);
  });

  it('rejects expenses >= salary', () => {
    expect(
      validateSetup({ ...DEFAULT_SETUP, monthlySalary: 50000, fixedExpenses: 50000 }).length,
    ).toBeGreaterThan(0);
  });

  it('rejects negative money', () => {
    expect(validateSetup({ ...DEFAULT_SETUP, plannedSip: -1 }).length).toBeGreaterThan(0);
  });
});
