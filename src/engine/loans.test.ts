import { describe, expect, it } from 'vitest';
import { CAR_ANNUAL_RATE, CAR_YEARS, HOME_ANNUAL_RATE, HOME_YEARS } from './defaults';
import { amortize, canAffordDownPayment, downPayment, emi, homePrincipal, originateLoan } from './loans';

describe('emi', () => {
  it('matches the spec table for the 2 BHK loan', () => {
    expect(downPayment(80_00_000)).toBe(16_00_000);
    expect(emi(64_00_000, HOME_ANNUAL_RATE, HOME_YEARS)).toBe(53_532);
  });

  it('matches 3 BHK, premium, and car rows', () => {
    expect(emi(88_00_000, HOME_ANNUAL_RATE, HOME_YEARS)).toBe(73_607);
    expect(emi(1_28_00_000, HOME_ANNUAL_RATE, HOME_YEARS)).toBe(1_07_064);
    expect(emi(4_00_000, CAR_ANNUAL_RATE, CAR_YEARS)).toBe(8_499);
    expect(emi(8_00_000, CAR_ANNUAL_RATE, CAR_YEARS)).toBe(16_998);
    expect(emi(16_00_000, CAR_ANNUAL_RATE, CAR_YEARS)).toBe(33_995);
  });
});

describe('canAffordDownPayment', () => {
  it('is true when cash covers 20%', () => {
    expect(canAffordDownPayment(16_00_000, 0, 80_00_000)).toBe(true);
  });

  it('counts STCG haircut on the shortfall', () => {
    expect(canAffordDownPayment(6_00_000, 12_00_000, 80_00_000)).toBe(true);
    expect(canAffordDownPayment(6_00_000, 11_99_999, 80_00_000)).toBe(false);
  });
});

describe('amortize', () => {
  it('reaches principal 0 after 240 home payments', () => {
    let loan = originateLoan('home', 64_00_000, HOME_ANNUAL_RATE, HOME_YEARS);
    expect(loan.emi).toBe(53_532);
    for (let i = 0; i < 240; i += 1) {
      const next = amortize(loan);
      if (next === null) {
        expect(i).toBe(239);
        expect(homePrincipal([])).toBe(0);
        return;
      }
      loan = next;
    }
    throw new Error('loan still alive after 240 months');
  });
});
