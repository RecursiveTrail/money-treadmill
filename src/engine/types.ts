export type Phase =
  | 'setup'
  | 'playing'
  | 'awaitingEvent'
  | 'awaitingBoss'
  | 'awaitingChoice'
  | 'ended';

export type SetupConfig = {
  startAgeYears: number;
  targetRetirementAge: number;
  monthlySalary: number;
  fixedExpenses: number;
  plannedSip: number;
  targetCorpusToday: number;
};

export type LedgerKind =
  | 'salary'
  | 'expense'
  | 'sip'
  | 'event'
  | 'liquidation'
  | 'boss'
  | 'interest'
  | 'system'
  | 'choice'
  | 'transfer'
  | 'taunt'
  | 'emi';

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

export type HouseTierId = 'bhk2' | 'bhk3' | 'premium';
export type CarTierId = 'used' | 'new' | 'suv';
export type LoanKind = 'home' | 'car';
export type ChoiceKind = 'house' | 'car' | 'marriage' | 'kid' | 'taunt';

export type Loan = {
  kind: LoanKind;
  originalPrincipal: number;
  principalRemaining: number;
  annualRate: number;
  emi: number;
  monthsTotal: number;
  monthsRemaining: number;
};

export type House = {
  tierId: HouseTierId;
  purchasePrice: number;
  currentValue: number;
};

export type OfferedFlags = {
  house: boolean;
  car: boolean;
  marriage: boolean;
  kid: boolean;
};

export type PendingChoice =
  | { kind: 'house'; title: string; copy: string; payableTierIds: HouseTierId[] }
  | { kind: 'car'; title: string; copy: string; payableTierIds: CarTierId[] }
  | {
      kind: 'marriage';
      title: string;
      copy: string;
      recommended: number;
      minSpend: number;
      maxSpend: number;
      step: number;
    }
  | { kind: 'kid'; title: string; copy: string; birthCost: number }
  | { kind: 'taunt'; title: string; copy: string };

export type ChoiceInput =
  | { action: 'dismiss' }
  | { action: 'accept'; tierId?: HouseTierId | CarTierId; spend?: number };

export type Ending = {
  result: 'win' | 'lose' | 'bankrupt';
  yearsPlayed: number;
  grossPortfolio: number;
  investedAmount: number;
  ltcgRate: number;
  tax: number;
  afterTax: number;
  cashLeft: number;
  homeEquity: number;
  netWorth: number;
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
  livingExpenses: number;
  rent: number;
  plannedSip: number;
  ltcgRate: number;           // starts 0.10
  pendingEvent: PendingEvent | null;
  pendingBoss: PendingBoss | null;
  pendingChoice: PendingChoice | null;
  needsAnnualBoss: boolean;   // this month is a post-start July
  loans: Loan[];
  house: House | null;
  ownedCar: boolean;
  married: boolean;
  hasChild: boolean;
  childMonths: number | null;
  schoolStarted: boolean;
  offered: OfferedFlags;
  ledger: LedgerEntry[];
  ledgerSeq: number;
  isPaused: boolean;          // player pause; modals also pause via phase
  tickSpeed: 1 | 2 | 4;
  ending: Ending | null;
};

export type Rng = () => number;
