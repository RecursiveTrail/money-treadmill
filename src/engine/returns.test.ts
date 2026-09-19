import { describe, expect, it } from 'vitest';
import { DEFAULT_SETUP } from './defaults';
import { transferToMarket } from './economy';
import { applyReturns, equityFactor } from './returns';
import { startGame } from './state';

describe('equityFactor', () => {
  it('is 0.99 at rng 0, 1.01 at 0.5, and ~1.03 at 0.999', () => {
    expect(equityFactor(() => 0)).toBe(0.99);
    expect(equityFactor(() => 0.5)).toBe(1.01);
    expect(equityFactor(() => 0.999)).toBeCloseTo(1.02996, 5);
  });
});

describe('applyReturns', () => {
  it('marks portfolio, FD, and house without ledger entries', () => {
    const rng = () => 0.5;
    const state = {
      ...startGame(DEFAULT_SETUP),
      portfolioValue: 100_000,
      cashBuffer: 100_000,
      house: { tierId: 'bhk2' as const, purchasePrice: 80_00_000, currentValue: 80_00_000 },
    };
    const next = applyReturns(state, rng);

    expect(next.portfolioValue).toBe(101_000);
    expect(next.cashBuffer).toBe(Math.round(100_000 * 1.05 ** (1 / 12)));
    expect(next.house?.currentValue).toBe(Math.round(80_00_000 * 1.05 ** (1 / 12)));
    expect(next.ledger).toEqual(state.ledger);
  });
});

describe('transferToMarket', () => {
  it('moves cash into portfolio and basis, clamped', () => {
    const state = {
      ...startGame(DEFAULT_SETUP),
      cashBuffer: 50_000,
      portfolioValue: 10_000,
      investedAmount: 10_000,
    };
    const next = transferToMarket(state, 80_000);

    expect(next.cashBuffer).toBe(0);
    expect(next.portfolioValue).toBe(60_000);
    expect(next.investedAmount).toBe(60_000);
  });

  it('ignores non-positive transfers', () => {
    const state = startGame(DEFAULT_SETUP);
    expect(transferToMarket(state, -1)).toBe(state);
  });
});
