import { describe, expect, it } from 'vitest';
import { DEFAULT_SETUP } from './defaults';
import { evaluateEnding } from './ending';
import { startGame } from './state';

describe('evaluateEnding', () => {
  it('discounts after-tax value by 7% for 20 years', () => {
    const state = {
      ...startGame(DEFAULT_SETUP),
      yearsPlayed: 20,
      portfolioValue: 1_64_00_000,
      investedAmount: 72_00_000,
      ltcgRate: 0.125,
      cashBuffer: 12_000,
    };
    const ending = evaluateEnding(state);
    const gains = 1_64_00_000 - 72_00_000;
    const tax = Math.round(gains * 0.125);
    const afterTax = Math.round(1_64_00_000 - tax);
    const real = Math.round(afterTax / 1.07 ** 20);
    expect(ending.tax).toBe(tax);
    expect(ending.afterTax).toBe(afterTax);
    expect(ending.realPurchasingPower).toBe(real);
    expect(ending.cashLeft).toBe(12_000);
    expect(ending.result).toBe(real >= 40_00_000 ? 'win' : 'lose');
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
