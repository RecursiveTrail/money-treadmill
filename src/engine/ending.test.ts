import { describe, expect, it } from 'vitest';
import { DEFAULT_SETUP, HOME_ANNUAL_RATE, HOME_YEARS } from './defaults';
import { evaluateEnding } from './ending';
import { originateLoan } from './loans';
import { startGame } from './state';

describe('evaluateEnding', () => {
  it('discounts after-tax net worth by 7% for 20 years', () => {
    const home = originateLoan('home', 10_00_000, HOME_ANNUAL_RATE, HOME_YEARS);
    const state = {
      ...startGame(DEFAULT_SETUP),
      yearsPlayed: 20,
      portfolioValue: 1_64_00_000,
      investedAmount: 72_00_000,
      ltcgRate: 0.125,
      cashBuffer: 12_000,
      house: { tierId: 'bhk2' as const, purchasePrice: 80_00_000, currentValue: 80_00_000 },
      loans: [{ ...home, principalRemaining: 10_00_000 }],
    };
    const ending = evaluateEnding(state);
    const gains = 1_64_00_000 - 72_00_000;
    const tax = Math.round(gains * 0.125);
    const afterTax = Math.round(1_64_00_000 - tax);
    const equity = 80_00_000 - 10_00_000;
    const netWorth = afterTax + 12_000 + equity;
    const real = Math.round(netWorth / 1.07 ** 20);
    expect(ending.tax).toBe(tax);
    expect(ending.afterTax).toBe(afterTax);
    expect(ending.homeEquity).toBe(equity);
    expect(ending.netWorth).toBe(netWorth);
    expect(ending.cashLeft).toBe(12_000);
    expect(ending.realPurchasingPower).toBe(real);
    expect(ending.result).toBe(real >= DEFAULT_SETUP.targetCorpusToday ? 'win' : 'lose');
  });

  it('wins only when real >= target', () => {
    const rich = evaluateEnding({
      ...startGame({ ...DEFAULT_SETUP, targetCorpusToday: 1 }),
      yearsPlayed: 1,
      portfolioValue: 10_000,
      investedAmount: 10_000,
    });
    expect(rich.result).toBe('win');
    const poor = evaluateEnding({
      ...startGame({ ...DEFAULT_SETUP, targetCorpusToday: 10_00_000 }),
      yearsPlayed: 1,
      portfolioValue: 100,
      investedAmount: 100,
    });
    expect(poor.result).toBe('lose');
  });
});
