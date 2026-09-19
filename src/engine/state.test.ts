import { describe, expect, it } from 'vitest';
import { DEFAULT_RENT, DEFAULT_SETUP, STARTING_CASH } from './defaults';
import { pushLedger, resetToSetup, startGame } from './state';

describe('startGame', () => {
  it('opens July of the start age with cash and no boss', () => {
    const s = startGame(DEFAULT_SETUP);
    expect(s.phase).toBe('playing');
    expect(s.ageYears).toBe(25);
    expect(s.ageMonths).toBe(0);
    expect(s.yearsPlayed).toBe(0);
    expect(s.cashBuffer).toBe(STARTING_CASH);
    expect(s.portfolioValue).toBe(0);
    expect(s.ltcgRate).toBe(0.1);
    expect(s.needsAnnualBoss).toBe(false);
  });

  it('splits default expenses into rent 25000 and living 30000', () => {
    const s = startGame(DEFAULT_SETUP);
    expect(s.rent).toBe(DEFAULT_RENT);
    expect(s.livingExpenses).toBe(30_000);
    expect(s.loans).toEqual([]);
    expect(s.house).toBeNull();
    expect(s.married).toBe(false);
    expect(s.hasChild).toBe(false);
    expect(s.childMonths).toBeNull();
    expect(s.schoolStarted).toBe(false);
    expect(s.pendingChoice).toBeNull();
    expect(s.offered).toEqual({ house: false, car: false, marriage: false, kid: false });
  });

  it('caps rent at expenses when setup expenses are below DEFAULT_RENT', () => {
    const s = startGame({ ...DEFAULT_SETUP, fixedExpenses: 20_000 });
    expect(s.rent).toBe(20_000);
    expect(s.livingExpenses).toBe(0);
  });
});

describe('pushLedger', () => {
  it('prepends and caps at 50', () => {
    let s = startGame(DEFAULT_SETUP);
    for (let i = 0; i < 55; i += 1) {
      s = pushLedger(s, 'system', `row ${i}`, 0);
    }
    expect(s.ledger).toHaveLength(50);
    expect(s.ledger[0]?.text).toBe('row 54');
  });
});

describe('resetToSetup', () => {
  it('returns to setup and keeps the last config', () => {
    const playing = startGame({ ...DEFAULT_SETUP, plannedSip: 10_000 });
    const reset = resetToSetup(playing);
    expect(reset.phase).toBe('setup');
    expect(reset.setup.plannedSip).toBe(10_000);
  });
});
