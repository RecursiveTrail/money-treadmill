import type { SetupConfig } from './types';

export const ORIGIN_YEAR = 2026;
export const STARTING_CASH = 50_000;
export const STARTING_LTCG = 0.1;
export const EVENT_CHANCE = 0.3;
export const MONTHLY_RETURN = 1.01;
export const INFLATION_RATE = 0.07;
export const STCG_RATE = 0.2;
export const LEDGER_CAP = 50;
export const DEFAULT_RENT = 25_000;
export const HOME_ANNUAL_RATE = 0.08;
export const HOME_YEARS = 20;
export const CAR_ANNUAL_RATE = 0.10;
export const CAR_YEARS = 5;
export const DOWN_PAYMENT_RATE = 0.2;
export const FD_ANNUAL_RATE = 0.05;
export const HOUSE_ANNUAL_APPRECIATION = 0.05;
export const WEDDING_MIN = 2_00_000;
export const WEDDING_MAX = 25_00_000;
export const WEDDING_STEP = 50_000;
export const WEDDING_RECOMMENDED = 8_00_000;
export const BIRTH_COST = 1_50_000;
export const KID_LIVING_BUMP = 12_000;
export const SCHOOL_LIVING_BUMP = 10_000;
export const SCHOOL_AFTER_MONTHS = 36;
export const TICK_MS: Record<1 | 2 | 4, number> = { 1: 2000, 2: 1000, 4: 500 };

export const DEFAULT_SETUP: SetupConfig = {
  startAgeYears: 25,
  targetRetirementAge: 45,
  monthlySalary: 100_000,
  fixedExpenses: 55_000,
  plannedSip: 30_000,
  targetCorpusToday: 75_00_000,
};
