import type { SetupConfig } from './types';

export const ORIGIN_YEAR = 2026;
export const STARTING_CASH = 50_000;
export const STARTING_LTCG = 0.1;
export const EVENT_CHANCE = 0.3;
export const MONTHLY_RETURN = 1.01;
export const INFLATION_RATE = 0.07;
export const STCG_RATE = 0.2;
export const LEDGER_CAP = 50;
export const TICK_MS: Record<1 | 2 | 4, number> = { 1: 2000, 2: 1000, 4: 500 };

export const DEFAULT_SETUP: SetupConfig = {
  startAgeYears: 25,
  targetRetirementAge: 45,
  monthlySalary: 100_000,
  fixedExpenses: 55_000,
  plannedSip: 30_000,
  targetCorpusToday: 40_00_000,
};
