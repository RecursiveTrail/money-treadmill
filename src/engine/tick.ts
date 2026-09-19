import { applyBossEffect, getAnnualBoss } from './bosses';
import { applyChoice, maybeChoice } from './choices';
import { EVENT_CHANCE, SCHOOL_AFTER_MONTHS, SCHOOL_LIVING_BUMP } from './defaults';
import { applyPaycheck, applySip, payBill } from './economy';
import { evaluateEnding } from './ending';
import { pickLifeEvent } from './events';
import { applyReturns } from './returns';
import { pushLedger } from './state';
import type { ChoiceInput, GameState, Rng } from './types';

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
  let bumped: GameState = {
    ...state,
    ageMonths,
    ageYears,
    yearsPlayed,
    phase: 'playing',
  };
  if (bumped.hasChild && bumped.childMonths !== null) {
    const childMonths = bumped.childMonths + 1;
    if (childMonths === SCHOOL_AFTER_MONTHS && !bumped.schoolStarted) {
      bumped = pushLedger(
        {
          ...bumped,
          childMonths,
          livingExpenses: bumped.livingExpenses + SCHOOL_LIVING_BUMP,
          schoolStarted: true,
        },
        'system',
        `School fees begin (+₹${SCHOOL_LIVING_BUMP.toLocaleString('en-IN')}/month)`,
        0,
      );
    } else {
      bumped = { ...bumped, childMonths };
    }
  }
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

export function continueMonthTail(state: GameState, rng: Rng): GameState {
  let next = applySip(state);
  next = applyReturns(next, rng);
  if (next.needsAnnualBoss) {
    return {
      ...next,
      pendingBoss: getAnnualBoss(next.yearsPlayed),
      phase: 'awaitingBoss',
    };
  }
  return finishMonth(next);
}

export function continueMonth(state: GameState, rng: Rng): GameState {
  let next = state;
  if (next.pendingEvent) {
    const event = next.pendingEvent;
    next = payBill(next, event.cost, event.title);
    next = { ...next, pendingEvent: null };
    if (next.phase === 'ended') {
      return next;
    }
  }
  next = maybeChoice(next);
  if (next.phase === 'awaitingChoice') {
    return next;
  }
  return continueMonthTail(next, rng);
}

export function applyBossAndFinish(state: GameState): GameState {
  const boss = state.pendingBoss;
  if (!boss) {
    return state;
  }
  let next = applyBossEffect(state, boss);
  if (boss.effect.type === 'oneShotBill') {
    next = payBill(next, boss.effect.amount, boss.title);
  }
  next = pushLedger(
    { ...next, pendingBoss: null, needsAnnualBoss: false },
    'boss',
    boss.title,
    0,
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
  return continueMonth(after, rng);
}

export function payPending(state: GameState, rng: Rng): GameState {
  if (state.phase === 'awaitingEvent') {
    return continueMonth(state, rng);
  }
  if (state.phase === 'awaitingBoss') {
    return applyBossAndFinish(state);
  }
  return state;
}

export function resolveChoice(state: GameState, input: ChoiceInput, rng: Rng): GameState {
  if (state.phase !== 'awaitingChoice' || !state.pendingChoice) {
    return state;
  }
  const { source } = state.pendingChoice;
  const applied = applyChoice(state, input);
  if (applied.phase === 'ended' || applied.phase === 'awaitingChoice') {
    return applied;
  }
  return source === 'auto' ? continueMonthTail(applied, rng) : applied;
}
