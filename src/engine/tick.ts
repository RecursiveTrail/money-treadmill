import { applyBossEffect, getAnnualBoss } from './bosses';
import { EVENT_CHANCE } from './defaults';
import { applyPaycheck, applySip, compound, payBill } from './economy';
import { evaluateEnding } from './ending';
import { pickLifeEvent } from './events';
import { pushLedger } from './state';
import type { GameState, Rng } from './types';

export function beginMonth(state: GameState, rng: Rng): GameState {
  if (state.phase !== 'playing') {
    return state;
  }
  let next: GameState = {
    ...state,
    needsAnnualBoss: state.ageMonths === 0 && state.yearsPlayed > 0,
  };
  next = applyPaycheck(next);
  if (next.phase === 'ended') {
    return next;
  }
  if (rng() < EVENT_CHANCE) {
    return { ...next, pendingEvent: pickLifeEvent(rng), phase: 'awaitingEvent' };
  }
  return next;
}

export function finishMonth(state: GameState): GameState {
  if (state.phase === 'ended') {
    return state;
  }
  let ageMonths = state.ageMonths + 1;
  let { ageYears, yearsPlayed } = state;
  if (ageMonths === 12) {
    ageMonths = 0;
    ageYears += 1;
    yearsPlayed += 1;
  }
  const bumped = { ...state, ageMonths, ageYears, yearsPlayed, phase: 'playing' as const };
  if (ageYears === state.setup.targetRetirementAge && ageMonths === 0) {
    return {
      ...bumped,
      phase: 'ended',
      isPaused: true,
      ending: evaluateEnding(bumped),
    };
  }
  return bumped;
}

export function continueMonth(state: GameState): GameState {
  let next = state;
  if (next.pendingEvent) {
    const event = next.pendingEvent;
    next = payBill(next, event.cost, event.title);
    next = { ...next, pendingEvent: null };
    if (next.phase === 'ended') {
      return next;
    }
  }
  next = applySip(next);
  next = compound(next);
  if (next.needsAnnualBoss) {
    return {
      ...next,
      pendingBoss: getAnnualBoss(next.yearsPlayed),
      phase: 'awaitingBoss',
    };
  }
  return finishMonth(next);
}

export function applyBossAndFinish(state: GameState): GameState {
  const boss = state.pendingBoss;
  if (!boss) {
    return state;
  }
  let next = applyBossEffect(state, boss.effect);
  if (boss.effect.type === 'oneShotBill') {
    next = payBill(next, boss.effect.amount, boss.title);
  }
  next = pushLedger(
    { ...next, pendingBoss: null, needsAnnualBoss: false },
    'boss',
    boss.title,
    boss.effect.type === 'oneShotBill' ? -boss.effect.amount : 0,
  );
  if (next.phase === 'ended') {
    return next;
  }
  return finishMonth(next);
}

export function tick(state: GameState, rng: Rng): GameState {
  if (state.phase !== 'playing') {
    return state;
  }
  const after = beginMonth(state, rng);
  if (after.phase !== 'playing') {
    return after;
  }
  return continueMonth(after);
}

export function payPending(state: GameState): GameState {
  if (state.phase === 'awaitingEvent') {
    return continueMonth(state);
  }
  if (state.phase === 'awaitingBoss') {
    return applyBossAndFinish(state);
  }
  return state;
}
