import { formatInr } from '../lib/formatInr';
import { MONTHLY_RETURN, STCG_RATE } from './defaults';
import { pushLedger } from './state';
import type { Ending, GameState } from './types';

function bankruptEnding(state: GameState): Ending {
  return {
    result: 'bankrupt',
    yearsPlayed: state.yearsPlayed,
    grossPortfolio: 0,
    investedAmount: 0,
    ltcgRate: state.ltcgRate,
    tax: 0,
    afterTax: 0,
    cashLeft: 0,
    realPurchasingPower: 0,
    targetCorpusToday: state.setup.targetCorpusToday,
  };
}

export function liquidate(state: GameState, deficit: number): GameState {
  if (deficit <= 0) {
    return state;
  }
  const taxHaircut = Math.round(deficit * STCG_RATE);
  const totalSell = deficit + taxHaircut;
  if (state.portfolioValue < totalSell) {
    const wiped = {
      ...state,
      cashBuffer: 0,
      portfolioValue: 0,
      investedAmount: 0,
      phase: 'ended' as const,
      isPaused: true,
      pendingEvent: null,
      pendingBoss: null,
      ending: bankruptEnding(state),
    };
    return pushLedger(wiped, 'liquidation', 'Liquidated portfolio: wiped out (includes 20% STCG)', -state.portfolioValue);
  }
  const next: GameState = {
    ...state,
    portfolioValue: state.portfolioValue - totalSell,
    investedAmount: Math.min(state.investedAmount, state.portfolioValue - totalSell),
  };
  return pushLedger(
    next,
    'liquidation',
    `Liquidated portfolio: −${formatInr(totalSell)} (includes 20% STCG)`,
    -totalSell,
  );
}

export function applyPaycheck(state: GameState): GameState {
  let next = pushLedger(
    { ...state, cashBuffer: state.cashBuffer + state.monthlySalary - state.fixedExpenses },
    'salary',
    `Salary credited`,
    state.monthlySalary,
  );
  next = pushLedger(next, 'expense', 'Fixed expenses', -state.fixedExpenses);
  if (next.cashBuffer < 0) {
    const deficit = -next.cashBuffer;
    next = liquidate({ ...next, cashBuffer: 0 }, deficit);
  }
  return next;
}

export function payBill(state: GameState, cost: number, text: string): GameState {
  let next = pushLedger(state, 'event', text, -cost);
  if (cost <= next.cashBuffer) {
    return { ...next, cashBuffer: next.cashBuffer - cost };
  }
  const deficit = cost - next.cashBuffer;
  return liquidate({ ...next, cashBuffer: 0 }, deficit);
}

export function applySip(state: GameState): GameState {
  const sip = Math.min(state.plannedSip, Math.max(state.cashBuffer, 0));
  if (sip === 0) {
    return pushLedger(state, 'sip', 'SIP skipped', 0);
  }
  const labeled =
    sip < state.plannedSip ? `SIP partial ${formatInr(sip)}` : `SIP ${formatInr(sip)}`;
  return pushLedger(
    {
      ...state,
      cashBuffer: state.cashBuffer - sip,
      investedAmount: state.investedAmount + sip,
      portfolioValue: state.portfolioValue + sip,
    },
    'sip',
    labeled,
    -sip,
  );
}

export function compound(state: GameState): GameState {
  return { ...state, portfolioValue: Math.round(state.portfolioValue * MONTHLY_RETURN) };
}
