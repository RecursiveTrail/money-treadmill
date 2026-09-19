import { describe, expect, it } from 'vitest';
import { DEFAULT_SETUP } from './defaults';
import { maybeChoice, openChoice } from './choices';
import { startGame } from './state';
import { resolveChoice, tick } from './tick';

const noopRng = () => 0.5;
const neverEvent = () => 0.99;

describe('house choice', () => {
  it('does not unlock 2 BHK when cash and portfolio cannot pay 16L after STCG', () => {
    const s = maybeChoice({
      ...startGame(DEFAULT_SETUP),
      cashBuffer: 1_00_000,
      portfolioValue: 1_00_000,
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
    expect(next.house?.currentValue).toBe(80_00_000);
    expect(next.rent).toBe(0);
    expect(next.cashBuffer).toBe(20_00_000 - 16_00_000);
    expect(next.loans[0]?.kind).toBe('home');
    expect(next.loans[0]?.principalRemaining).toBe(64_00_000);
    expect(next.loans[0]?.emi).toBe(53_532);
    expect(next.pendingChoice).toBeNull();
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
    expect(next.cashBuffer).toBe(16_00_000);
    expect(next.pendingChoice).toBeNull();
  });

  it('does not auto-pause every month after dismiss, but July reminder does', () => {
    let s = maybeChoice({ ...startGame(DEFAULT_SETUP), cashBuffer: 16_00_000 });
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
