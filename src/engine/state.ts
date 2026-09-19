import { ageLabel, monthLabel } from './calendar';
import {
  DEFAULT_RENT,
  DEFAULT_SETUP,
  LEDGER_CAP,
  STARTING_CASH,
  STARTING_LTCG,
} from './defaults';
import type { GameState, LedgerKind, SetupConfig } from './types';

export function startGame(setup: SetupConfig): GameState {
  const rent = Math.min(DEFAULT_RENT, setup.fixedExpenses);
  return {
    phase: 'playing',
    setup,
    ageYears: setup.startAgeYears,
    ageMonths: 0,
    yearsPlayed: 0,
    cashBuffer: STARTING_CASH,
    portfolioValue: 0,
    investedAmount: 0,
    monthlySalary: setup.monthlySalary,
    livingExpenses: setup.fixedExpenses - rent,
    rent,
    plannedSip: setup.plannedSip,
    ltcgRate: STARTING_LTCG,
    pendingEvent: null,
    pendingBoss: null,
    pendingChoice: null,
    needsAnnualBoss: false,
    loans: [],
    house: null,
    ownedCar: false,
    married: false,
    hasChild: false,
    childMonths: null,
    schoolStarted: false,
    offered: { house: false, car: false, marriage: false, kid: false },
    ledger: [],
    ledgerSeq: 0,
    isPaused: false,
    tickSpeed: 1,
    ending: null,
  };
}

export function emptySetupState(): GameState {
  return { ...startGame(DEFAULT_SETUP), phase: 'setup' };
}

export function resetToSetup(state: GameState): GameState {
  return {
    ...startGame(state.setup),
    phase: 'setup',
    tickSpeed: state.tickSpeed,
  };
}

export function pushLedger(
  state: GameState,
  kind: LedgerKind,
  text: string,
  amount: number,
): GameState {
  const seq = state.ledgerSeq + 1;
  const entry = {
    id: String(seq),
    ageLabel: ageLabel(state.ageYears, state.ageMonths),
    monthLabel: monthLabel(state.yearsPlayed, state.ageMonths),
    kind,
    text,
    amount,
  };
  return {
    ...state,
    ledgerSeq: seq,
    ledger: [entry, ...state.ledger].slice(0, LEDGER_CAP),
  };
}
