import { describe, expect, it } from 'vitest';
import { DEFAULT_SETUP } from './defaults';
import { originateLoan } from './loans';
import { emergencyTarget, homeEquity, liveNetWorth } from './netWorth';
import { HOME_ANNUAL_RATE, HOME_YEARS } from './defaults';
import { startGame } from './state';

describe('netWorth helpers', () => {
  it('counts house value minus home principal and ignores a car loan', () => {
    const home = originateLoan('home', 64_00_000, HOME_ANNUAL_RATE, HOME_YEARS);
    const car = originateLoan('car', 4_00_000, 0.1, 5);
    const state = {
      ...startGame(DEFAULT_SETUP),
      portfolioValue: 10_00_000,
      cashBuffer: 2_00_000,
      house: { tierId: 'bhk2' as const, purchasePrice: 80_00_000, currentValue: 85_00_000 },
      loans: [home, car],
    };
    expect(homeEquity(state)).toBe(85_00_000 - home.principalRemaining);
    expect(liveNetWorth(state)).toBe(10_00_000 + 2_00_000 + (85_00_000 - home.principalRemaining));
  });

  it('is 12× of living + rent + EMIs', () => {
    const home = originateLoan('home', 64_00_000, HOME_ANNUAL_RATE, HOME_YEARS);
    const state = {
      ...startGame(DEFAULT_SETUP),
      livingExpenses: 30_000,
      rent: 0,
      loans: [home],
    };
    expect(emergencyTarget(state)).toBe(12 * (30_000 + home.emi));
  });
});
