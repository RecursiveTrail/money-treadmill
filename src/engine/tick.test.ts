import { describe, expect, it } from 'vitest';
import { DEFAULT_SETUP } from './defaults';
import { startGame } from './state';
import { applyBossAndFinish, payPending, tick } from './tick';
import type { GameState, Rng } from './types';

const neverEvent: Rng = () => 0.99;
const alwaysEvent: Rng = () => 0.0;

function completeQuietMonth(state: GameState): GameState {
  let next = tick(state, neverEvent);
  if (next.phase === 'awaitingBoss' || next.phase === 'awaitingEvent') {
    next = payPending(next);
  }
  return next;
}

describe('tick', () => {
  it('is a no-op when not playing', () => {
    const setup = { ...startGame(DEFAULT_SETUP), phase: 'setup' as const };
    expect(tick(setup, alwaysEvent)).toEqual(setup);
  });

  it('schedules an event when rng < 0.30 and never when rng >= 0.30', () => {
    const opened = tick(startGame(DEFAULT_SETUP), alwaysEvent);
    expect(opened.phase).toBe('awaitingEvent');
    expect(opened.pendingEvent).not.toBeNull();
    const quiet = tick(startGame(DEFAULT_SETUP), neverEvent);
    expect(quiet.pendingEvent).toBeNull();
    expect(quiet.phase === 'playing' || quiet.phase === 'awaitingBoss').toBe(true);
  });

  it('is age 26y 0m and yearsPlayed 1 after 12 completed months', () => {
    let s = startGame(DEFAULT_SETUP);
    for (let i = 0; i < 12; i += 1) {
      s = completeQuietMonth(s);
    }
    expect(s.ageYears).toBe(26);
    expect(s.ageMonths).toBe(0);
    expect(s.yearsPlayed).toBe(1);
    expect(s.phase).toBe('playing');
  });

  it('ends after 240 completed default months with yearsPlayed 20', () => {
    let s = startGame(DEFAULT_SETUP);
    let guard = 0;
    while (s.phase !== 'ended' && guard < 800) {
      if (s.phase === 'playing') {
        s = tick(s, neverEvent);
      } else {
        s = payPending(s);
      }
      guard += 1;
    }
    expect(s.phase).toBe('ended');
    expect(s.yearsPlayed).toBe(20);
    expect(s.ending).not.toBeNull();
    expect(s.ending?.result === 'win' || s.ending?.result === 'lose').toBe(true);
  });

  it('logs a Diwali oneShotBill of -15000 only once', () => {
    const next = applyBossAndFinish({
      ...startGame(DEFAULT_SETUP),
      cashBuffer: 50_000,
      pendingBoss: {
        id: 'diwali-boss',
        title: 'Breaking News: Diwali',
        copy: 'Company Diwali gift is a thali. The bill is yours.',
        effect: { type: 'oneShotBill', amount: 15_000 },
      },
      phase: 'awaitingBoss',
    });
    expect(next.ledger.filter((entry) => entry.amount === -15_000)).toHaveLength(1);
  });
});
