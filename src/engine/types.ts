export type Phase = 'setup' | 'playing' | 'awaitingEvent' | 'awaitingBoss' | 'ended';

export type SetupConfig = {
  startAgeYears: number;
  targetRetirementAge: number;
  monthlySalary: number;
  fixedExpenses: number;
  plannedSip: number;
  targetCorpusToday: number;
};

export type LedgerKind = 'salary' | 'expense' | 'sip' | 'event' | 'liquidation' | 'boss' | 'interest' | 'system';

export type LedgerEntry = {
  id: string;
  ageLabel: string;      // "25y 3m"
  monthLabel: string;    // "Oct 2026"
  kind: LedgerKind;
  text: string;
  amount: number;        // signed rupees; 0 for flavour-only
};

export type PendingEvent = { id: string; title: string; copy: string; cost: number };

export type BossEffect =
  | { type: 'salaryMul'; factor: number }
  | { type: 'expenseAdd'; amount: number }
  | { type: 'expenseMul'; factor: number }
  | { type: 'setLtcg'; rate: number }
  | { type: 'oneShotBill'; amount: number }
  | { type: 'flavour' };

export type PendingBoss = { id: string; title: string; copy: string; effect: BossEffect };

export type Ending = {
  result: 'win' | 'lose' | 'bankrupt';
  yearsPlayed: number;
  grossPortfolio: number;
  investedAmount: number;
  ltcgRate: number;
  tax: number;
  afterTax: number;
  cashLeft: number;
  realPurchasingPower: number;
  targetCorpusToday: number;
};

export type GameState = {
  phase: Phase;
  setup: SetupConfig;
  ageYears: number;
  ageMonths: number;          // 0–11; 0 is always July
  yearsPlayed: number;        // 0 at start; +1 on each wrap into July
  cashBuffer: number;
  portfolioValue: number;
  investedAmount: number;     // cost basis for LTCG
  monthlySalary: number;
  fixedExpenses: number;
  plannedSip: number;
  ltcgRate: number;           // starts 0.10
  pendingEvent: PendingEvent | null;
  pendingBoss: PendingBoss | null;
  needsAnnualBoss: boolean;   // this month is a post-start July
  ledger: LedgerEntry[];
  ledgerSeq: number;
  isPaused: boolean;          // player pause; modals also pause via phase
  tickSpeed: 1 | 2 | 4;
  ending: Ending | null;
};

export type Rng = () => number;
