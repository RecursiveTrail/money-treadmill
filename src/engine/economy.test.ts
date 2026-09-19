import { describe, expect, it } from 'vitest';
import { DEFAULT_SETUP } from './defaults';
import { applyPaycheck, applySip, compound, liquidate, payBill } from './economy';
import { startGame } from './state';

function withCash(cash: number, portfolio = 0) {
  return { ...startGame(DEFAULT_SETUP), cashBuffer: cash, portfolioValue: portfolio, investedAmount: portfolio };
}

describe('applyPaycheck', () => {
  it('adds salary minus expenses to existing cash', () => {
    const next = applyPaycheck(withCash(10_000));
    expect(next.cashBuffer).toBe(10_000 + 100_000 - 55_000);
  });

  it('liquidates STCG when expenses exceed cash + salary', () => {
    const next = applyPaycheck({
      ...withCash(0, 100_000),
      monthlySalary: 10_000,
      livingExpenses: 40_000,
      rent: 0,
    });
    expect(next.cashBuffer).toBe(0);
    expect(next.portfolioValue).toBe(100_000 - 30_000 - 6_000);
    expect(next.phase).not.toBe('ended');
  });
});

describe('payBill', () => {
  it('sells deficit + 20% STCG from the portfolio', () => {
    const next = payBill(withCash(10_000, 100_000), 40_000, 'Hospital');
    expect(next.cashBuffer).toBe(0);
    expect(next.portfolioValue).toBe(64_000);
  });

  it('bankrupts when the portfolio cannot cover the sell', () => {
    const next = payBill(withCash(0, 10_000), 40_000, 'Ruin');
    expect(next.phase).toBe('ended');
    expect(next.ending?.result).toBe('bankrupt');
    expect(next.portfolioValue).toBe(0);
  });
});

describe('applySip', () => {
  it('invests only available cash and never liquidates', () => {
    const next = applySip({ ...withCash(12_000, 50_000), plannedSip: 30_000 });
    expect(next.cashBuffer).toBe(0);
    expect(next.portfolioValue).toBe(62_000);
    expect(next.investedAmount).toBe(62_000);
    expect(next.phase).not.toBe('ended');
  });

  it('skips SIP when cash is 0 and leaves portfolio unchanged before compound', () => {
    const before = withCash(0, 80_000);
    const next = applySip({ ...before, plannedSip: 30_000 });
    expect(next.portfolioValue).toBe(80_000);
    expect(next.investedAmount).toBe(80_000);
  });
});

describe('compound', () => {
  it('applies 1% and rounds to a rupee', () => {
    expect(compound(withCash(0, 100_000)).portfolioValue).toBe(101_000);
  });
});

describe('liquidate', () => {
  it('does nothing when deficit is 0', () => {
    const start = withCash(5, 9);
    expect(liquidate(start, 0).portfolioValue).toBe(9);
  });
});
