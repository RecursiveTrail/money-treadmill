import { formatInr } from '../lib/formatInr';
import { MONTHLY_RETURN, STCG_RATE } from './defaults';
import { amortize } from './loans';
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
    homeEquity: 0,
    netWorth: 0,
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
      pendingChoice: null,
      house: null,
      loans: [],
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
  const emiTotal = state.loans.reduce((sum, loan) => sum + loan.emi, 0);
  const outflow = state.livingExpenses + state.rent + emiTotal;
  let next = pushLedger(
    { ...state, cashBuffer: state.cashBuffer + state.monthlySalary - outflow },
    'salary',
    `Salary credited`,
    state.monthlySalary,
  );
  next = pushLedger(next, 'expense', 'Living expenses', -state.livingExpenses);
  if (state.rent > 0) {
    next = pushLedger(next, 'expense', 'Rent', -state.rent);
  }
  for (const loan of state.loans) {
    next = pushLedger(next, 'emi', loan.kind === 'home' ? 'Home EMI' : 'Car EMI', -loan.emi);
  }
  if (next.cashBuffer < 0) {
    const deficit = -next.cashBuffer;
    next = liquidate({ ...next, cashBuffer: 0 }, deficit);
  }
  if (next.phase === 'ended') {
    return next;
  }
  const loans = next.loans
    .map((loan) => amortize(loan))
    .filter((loan): loan is NonNullable<typeof loan> => loan !== null);
  return { ...next, loans };
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
