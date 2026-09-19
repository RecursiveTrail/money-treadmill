import { describe, expect, it } from 'vitest';
import { DEFAULT_SETUP, HOME_ANNUAL_RATE, HOME_YEARS } from './defaults';
import { applyPaycheck, applySip, compound, liquidate, payBill } from './economy';
import { originateLoan } from './loans';
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

  it('ledger lists living and rent expenses separately on default split', () => {
    const next = applyPaycheck(withCash(10_000));
    const living = next.ledger.find((e) => e.text === 'Living expenses');
    const rent = next.ledger.find((e) => e.text === 'Rent');
    expect(living?.amount).toBe(-30_000);
    expect(rent?.amount).toBe(-25_000);
  });

  it('omits rent ledger line when rent is zero', () => {
    const next = applyPaycheck({ ...withCash(10_000), rent: 0, livingExpenses: 55_000 });
    expect(next.ledger.some((e) => e.text === 'Rent')).toBe(false);
    expect(next.ledger.find((e) => e.text === 'Living expenses')?.amount).toBe(-55_000);
  });

  it('deducts living, rent, and EMI then amortizes when cash covers it', () => {
    const loan = originateLoan('home', 64_00_000, HOME_ANNUAL_RATE, HOME_YEARS);
    const next = applyPaycheck({
      ...withCash(0),
      livingExpenses: 30_000,
      rent: 0,
      loans: [loan],
      monthlySalary: 1_00_000,
    });
    expect(next.cashBuffer).toBe(0 + 1_00_000 - 30_000 - loan.emi);
    expect(next.loans[0]?.principalRemaining).toBeLessThan(loan.principalRemaining);
    expect(next.phase).not.toBe('ended');
  });

  it('forfeits house and loans on bankrupt', () => {
    const loan = originateLoan('home', 64_00_000, HOME_ANNUAL_RATE, HOME_YEARS);
    const next = applyPaycheck({
      ...withCash(0, 0),
      monthlySalary: 10_000,
      livingExpenses: 30_000,
      rent: 0,
      loans: [loan],
      house: { tierId: 'bhk2', purchasePrice: 80_00_000, currentValue: 80_00_000 },
    });
    expect(next.phase).toBe('ended');
    expect(next.ending?.result).toBe('bankrupt');
    expect(next.house).toBeNull();
    expect(next.loans).toEqual([]);
    expect(next.ledger.some((e) => e.kind === 'emi')).toBe(false);
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
