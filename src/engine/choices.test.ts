import { describe, expect, it } from 'vitest';
import { DEFAULT_SETUP } from './defaults';
import { applyChoice, maybeChoice, openChoice } from './choices';
import { sipCap } from './economy';
import { homeEquity, liveNetWorth } from './netWorth';
import { startGame } from './state';
import { finishMonth, resolveChoice, tick } from './tick';

const noopRng = () => 0.5;
const neverEvent = () => 0.99;

describe('house choice', () => {
  it('does not finish or compound a month after dismissing a HUD choice', () => {
    const boundary = {
      ...startGame(DEFAULT_SETUP),
      ageMonths: 4,
      cashBuffer: 16_00_000,
      portfolioValue: 10_00_000,
      investedAmount: 10_00_000,
    };
    const paused = openChoice(boundary, 'house');

    const next = resolveChoice(paused, { action: 'dismiss' }, noopRng);

    expect(next.ageMonths).toBe(boundary.ageMonths);
    expect(next.cashBuffer).toBe(boundary.cashBuffer);
    expect(next.portfolioValue).toBe(boundary.portfolioValue);
  });

  it('does not unlock 2 BHK when cash and portfolio cannot pay 16L after STCG', () => {
    const s = maybeChoice({
      ...startGame(DEFAULT_SETUP),
      cashBuffer: 1_00_000,
      portfolioValue: 1_00_000,
      ownedCar: true,
    });
    expect(s.pendingChoice).toBeNull();
    expect(openChoice(s, 'house').phase).toBe(s.phase);
  });

  it('auto-pauses the first month 2 BHK is payable from cash', () => {
    const s = maybeChoice({ ...startGame(DEFAULT_SETUP), cashBuffer: 16_00_000 });
    expect(s.phase).toBe('awaitingChoice');
    expect(s.pendingChoice?.kind).toBe('house');
    expect(s.offered.house).toBe(true);
  });

  it('buys 2 BHK from cash, zeros rent, and originates the 64L loan', () => {
    const paused = maybeChoice({
      ...startGame(DEFAULT_SETUP),
      cashBuffer: 20_00_000,
      livingExpenses: 30_000,
      rent: 25_000,
      plannedSip: 0,
    });
    const next = resolveChoice(paused, { action: 'accept', tierId: 'bhk2' }, noopRng);
    expect(next.house?.tierId).toBe('bhk2');
    expect(next.house?.currentValue).toBe(Math.round(80_00_000 * 1.05 ** (1 / 12)));
    expect(next.rent).toBe(0);
    expect(next.cashBuffer).toBe(Math.round((20_00_000 - 16_00_000) * 1.05 ** (1 / 12)));
    expect(next.loans[0]?.kind).toBe('home');
    expect(next.loans[0]?.principalRemaining).toBe(64_00_000);
    expect(next.loans[0]?.emi).toBe(53_532);
    expect(next.pendingChoice).toBeNull();
  });

  it('clamps planned SIP after a house purchase raises EMI', () => {
    const paused = openChoice(
      {
        ...startGame(DEFAULT_SETUP),
        cashBuffer: 16_00_000,
        plannedSip: 80_000,
      },
      'house',
    );
    const next = resolveChoice(paused, { action: 'accept', tierId: 'bhk2' }, noopRng);
    expect(next.house).not.toBeNull();
    expect(next.plannedSip).toBe(sipCap(next));
    expect(next.plannedSip).toBeLessThan(80_000);
  });

  it('uses STCG sell when cash is 6L and portfolio is large', () => {
    const paused = maybeChoice({
      ...startGame(DEFAULT_SETUP),
      cashBuffer: 6_00_000,
      portfolioValue: 50_00_000,
      investedAmount: 50_00_000,
      plannedSip: 0,
    });
    const next = resolveChoice(paused, { action: 'accept', tierId: 'bhk2' }, noopRng);
    expect(next.house).not.toBeNull();
    expect(next.cashBuffer).toBe(0);
    expect(next.portfolioValue).toBe(Math.round((50_00_000 - Math.round(10_00_000 * 1.2)) * 1.01));
  });

  it('dismisses with no rupee movement and keeps rent', () => {
    const paused = maybeChoice({
      ...startGame(DEFAULT_SETUP),
      cashBuffer: 16_00_000,
      rent: 25_000,
      plannedSip: 0,
    });
    const next = resolveChoice(paused, { action: 'dismiss' }, noopRng);
    expect(next.house).toBeNull();
    expect(next.rent).toBe(25_000);
    expect(next.cashBuffer).toBe(Math.round(16_00_000 * 1.05 ** (1 / 12)));
    expect(next.pendingChoice).toBeNull();
  });

  it('does not auto-pause every month after dismiss, but July reminder does', () => {
    let s = maybeChoice({
      ...startGame(DEFAULT_SETUP),
      cashBuffer: 16_00_000,
      ownedCar: true,
    });
    s = resolveChoice(s, { action: 'dismiss' }, noopRng);
    const again = maybeChoice({ ...s, phase: 'playing', cashBuffer: 16_00_000 });
    expect(again.phase).not.toBe('awaitingChoice');
    const july = maybeChoice({
      ...s,
      phase: 'playing',
      cashBuffer: 16_00_000,
      ageMonths: 0,
      yearsPlayed: 1,
    });
    expect(july.phase).toBe('awaitingChoice');
    expect(july.pendingChoice?.kind).toBe('house');
  });

  it('rejects an unaffordable tier without partially resolving the choice', () => {
    const paused = maybeChoice({
      ...startGame(DEFAULT_SETUP),
      cashBuffer: 16_00_000,
      plannedSip: 0,
    });
    const next = resolveChoice(paused, { action: 'accept', tierId: 'premium' }, noopRng);
    expect(next).toEqual(paused);
  });

  it('tick is a no-op in awaitingChoice', () => {
    const paused = maybeChoice({ ...startGame(DEFAULT_SETUP), cashBuffer: 16_00_000 });
    expect(tick(paused, neverEvent)).toEqual(paused);
  });
});

describe('car choice', () => {
  it('unlocks used when 1L down is payable and does not add car value to net worth', () => {
    const paused = maybeChoice({
      ...startGame(DEFAULT_SETUP),
      cashBuffer: 1_00_000,
      plannedSip: 0,
      offered: { house: true, car: false, marriage: false, kid: false },
      house: { tierId: 'bhk2', purchasePrice: 80_00_000, currentValue: 80_00_000 },
      rent: 0,
    });
    expect(paused.pendingChoice?.kind).toBe('car');
    const next = resolveChoice(paused, { action: 'accept', tierId: 'used' }, noopRng);
    expect(next.ownedCar).toBe(true);
    expect(next.loans.some((loan) => loan.kind === 'car' && loan.emi === 8_499)).toBe(true);
    expect(liveNetWorth(next)).toBe(next.portfolioValue + next.cashBuffer + homeEquity(next));
  });

  it('dismisses a car with no loan and July reminder after dismiss', () => {
    const paused = maybeChoice({
      ...startGame(DEFAULT_SETUP),
      cashBuffer: 1_00_000,
      plannedSip: 0,
      offered: { house: true, car: false, marriage: false, kid: false },
      house: { tierId: 'bhk2', purchasePrice: 80_00_000, currentValue: 80_00_000 },
      rent: 0,
    });
    expect(paused.pendingChoice?.kind).toBe('car');
    const dismissed = resolveChoice(paused, { action: 'dismiss' }, noopRng);
    expect(dismissed.ownedCar).toBe(false);
    expect(dismissed.loans.some((loan) => loan.kind === 'car')).toBe(false);
    const midYear = maybeChoice({ ...dismissed, phase: 'playing', cashBuffer: 1_00_000 });
    expect(midYear.pendingChoice).toBeNull();
    const july = maybeChoice({
      ...dismissed,
      phase: 'playing',
      cashBuffer: 1_00_000,
      ageMonths: 0,
      yearsPlayed: 1,
    });
    expect(july.pendingChoice?.kind).toBe('car');
  });
});

describe('marriage and kid', () => {
  it('does not offer marriage before age 30', () => {
    const s = maybeChoice({
      ...startGame(DEFAULT_SETUP),
      ageYears: 29,
      cashBuffer: 20_00_000,
      house: { tierId: 'bhk2', purchasePrice: 80_00_000, currentValue: 80_00_000 },
      ownedCar: true,
    });
    expect(s.pendingChoice?.kind === 'marriage').toBe(false);
  });

  it('offers marriage at 30, records low-spend copy on acceptance, and leaves decline unmarried', () => {
    const paused = maybeChoice({
      ...startGame(DEFAULT_SETUP),
      ageYears: 30,
      cashBuffer: 20_00_000,
      plannedSip: 0,
    });
    expect(paused.pendingChoice?.kind).toBe('marriage');

    const declined = resolveChoice(paused, { action: 'dismiss' }, noopRng);
    expect(declined.married).toBe(false);

    const done = resolveChoice(
      paused,
      { action: 'accept', spend: 3_00_000 },
      noopRng,
    );
    expect(done.married).toBe(true);
    expect(
      done.ledger.some(
        (entry) =>
          entry.text.includes('laminated') || entry.text.includes('condolence'),
      ),
    ).toBe(true);
  });

  it('does not offer shaadi until the wedding floor is payable', () => {
    const s = maybeChoice({
      ...startGame(DEFAULT_SETUP),
      ageYears: 30,
      cashBuffer: 1_00_000,
      portfolioValue: 0,
      ownedCar: true,
    });
    expect(s.pendingChoice).toBeNull();
    expect(openChoice(s, 'marriage').phase).toBe('playing');
  });

  it('offers shaadi once cash plus STCG cover the floor', () => {
    const s = maybeChoice({
      ...startGame(DEFAULT_SETUP),
      ageYears: 30,
      cashBuffer: 2_00_000,
      ownedCar: true,
    });
    expect(s.pendingChoice?.kind).toBe('marriage');
  });

  it('does not offer a kid until the birth bill is payable', () => {
    const s = maybeChoice({
      ...startGame(DEFAULT_SETUP),
      ageYears: 30,
      married: true,
      cashBuffer: 50_000,
      portfolioValue: 0,
      ownedCar: true,
      offered: { house: true, car: true, marriage: true, kid: false },
    });
    expect(s.pendingChoice).toBeNull();
    expect(openChoice(s, 'kid').phase).toBe('playing');
  });

  it('reminds about dismissed marriage in July but not mid-year', () => {
    const paused = maybeChoice({
      ...startGame(DEFAULT_SETUP),
      ageYears: 30,
      ageMonths: 4,
      cashBuffer: 20_00_000,
      offered: { house: true, car: true, marriage: false, kid: false },
    });
    expect(paused.pendingChoice?.kind).toBe('marriage');

    const dismissed = resolveChoice(paused, { action: 'dismiss' }, noopRng);
    const midYear = maybeChoice({
      ...dismissed,
      phase: 'playing',
      ageMonths: 5,
      cashBuffer: 20_00_000,
    });
    expect(midYear.pendingChoice).toBeNull();

    const july = maybeChoice({
      ...dismissed,
      phase: 'playing',
      ageMonths: 0,
      yearsPlayed: 1,
      cashBuffer: 20_00_000,
    });
    expect(july.pendingChoice?.kind).toBe('marriage');
  });

  it('offers a kid the month after marriage, not in the wedding resolution', () => {
    const paused = maybeChoice({
      ...startGame(DEFAULT_SETUP),
      ageYears: 30,
      cashBuffer: 20_00_000,
      plannedSip: 0,
    });
    const married = resolveChoice(
      paused,
      { action: 'accept', spend: 8_00_000 },
      noopRng,
    );
    expect(married.pendingChoice).toBeNull();
    expect(married.hasChild).toBe(false);

    const nextMonth = maybeChoice({ ...married, phase: 'playing' });
    expect(nextMonth.pendingChoice?.kind).toBe('kid');
  });

  it('reminds about a dismissed kid in July but not mid-year', () => {
    const paused = maybeChoice({
      ...startGame(DEFAULT_SETUP),
      ageYears: 30,
      ageMonths: 4,
      married: true,
      cashBuffer: 5_00_000,
      offered: { house: true, car: true, marriage: true, kid: false },
    });
    expect(paused.pendingChoice?.kind).toBe('kid');

    const dismissed = resolveChoice(paused, { action: 'dismiss' }, noopRng);
    const midYear = maybeChoice({
      ...dismissed,
      phase: 'playing',
      ageMonths: 5,
    });
    expect(midYear.pendingChoice).toBeNull();

    const july = maybeChoice({
      ...dismissed,
      phase: 'playing',
      ageMonths: 0,
      yearsPlayed: 1,
    });
    expect(july.pendingChoice?.kind).toBe('kid');
  });

  it('charges for birth, raises living costs, and starts school at child month 36', () => {
    const kidPause = maybeChoice({
      ...startGame(DEFAULT_SETUP),
      ageYears: 30,
      married: true,
      offered: { house: true, car: true, marriage: true, kid: false },
      cashBuffer: 5_00_000,
      plannedSip: 0,
      livingExpenses: 30_000,
    });
    expect(kidPause.pendingChoice?.kind).toBe('kid');

    const born = resolveChoice(kidPause, { action: 'accept' }, noopRng);
    expect(born.hasChild).toBe(true);
    expect(born.livingExpenses).toBe(42_000);
    expect(
      born.ledger.some(
        (entry) => entry.text.includes('Birth') && entry.amount === -1_50_000,
      ),
    ).toBe(true);

    let s = born;
    let guard = 0;
    while (s.childMonths !== 36 && guard < 40) {
      s = finishMonth({ ...s, phase: 'playing', pendingChoice: null });
      guard += 1;
    }
    expect(guard).toBeLessThan(40);
    expect(s.childMonths).toBe(36);
    expect(s.schoolStarted).toBe(true);
    expect(s.livingExpenses).toBe(52_000);
  });
});

describe('taunts', () => {
  it('does not debit cash in January when still renting', () => {
    const s = maybeChoice({
      ...startGame(DEFAULT_SETUP),
      ageMonths: 6,
      yearsPlayed: 0,
      cashBuffer: 50_000,
      offered: { house: true, car: true, marriage: true, kid: true },
    });
    expect(s.pendingChoice).toEqual({
      kind: 'taunt',
      source: 'auto',
      title: 'Log kya kahenge?',
      copy: [
        'Ghar kab le rahe ho? Rent receipt is not an heirloom.',
        'Car kab? Cab receipts do not impress the colony.',
      ].join('\n'),
    });

    const next = applyChoice(s, { action: 'dismiss' });
    expect(next.cashBuffer).toBe(50_000);
    expect(next.phase).toBe('playing');
    expect(next.pendingChoice).toBeNull();
  });

  it('does not taunt opening July', () => {
    const s = maybeChoice({
      ...startGame(DEFAULT_SETUP),
      offered: { house: true, car: true, marriage: true, kid: true },
    });
    expect(s.pendingChoice).toBeNull();
  });

  it('does not steal the slot when house is newly payable', () => {
    const s = maybeChoice({
      ...startGame(DEFAULT_SETUP),
      ageMonths: 6,
      cashBuffer: 16_00_000,
      offered: { house: false, car: true, marriage: true, kid: true },
    });
    expect(s.pendingChoice?.kind).toBe('house');
  });

  it('includes marriage and child copy when those milestones are missing', () => {
    const unmarried = maybeChoice({
      ...startGame(DEFAULT_SETUP),
      ageYears: 27,
      ageMonths: 6,
      house: { tierId: 'bhk2', purchasePrice: 80_00_000, currentValue: 80_00_000 },
      ownedCar: true,
      offered: { house: true, car: true, marriage: true, kid: true },
    });
    expect(unmarried.pendingChoice?.copy).toBe(
      'Shaadi kab kar rahe ho? Relatives have formed a committee.',
    );

    const married = maybeChoice({
      ...unmarried,
      phase: 'playing',
      pendingChoice: null,
      married: true,
    });
    expect(married.pendingChoice?.copy).toBe(
      'Bacche kab? Your mother forwarded a baby reel.',
    );
  });
});
