# Optional Life Commitments Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add optional house/car/marriage/kid, flavour taunts, FD + noisy equity, and a playable (including phone) net-worth HUD, as specified in `docs/superpowers/specs/2026-09-19-optional-life-commitments-design.md`.

**Architecture:** Keep the three layers. New pure modules `loans.ts`, `choices.ts`, `returns.ts`, `netWorth.ts`. `tick.ts` inserts `awaitingChoice` after the event and before SIP. Zustand only adds `resolveChoice`, `openChoice`, `transferToMarket`. React still does not tick.

**Tech Stack:** Vite, React, TypeScript strict, Tailwind, Zustand, Vitest (node). No new dependencies.

## Global Constraints

- TypeScript strict; no `any`
- Money and phases stay in `src/engine/`; Zustand is a thin wrapper; React must not tick the calendar
- Do not reset cash each month
- Do not auto-invest leftover buffer (only `plannedSip` and explicit `transferToMarket`)
- Do not liquidate to fund SIP
- Do not liquidate to pay a dismissed choice
- Integer rupees after every multiply (`Math.round`)
- `ageMonths === 0` is July; age increments after SIP/boss; retirement July is not played
- Opening July has no boss
- Dark theme default; CSS variables (`--app-bg`, `--money`, `--expense`, …)
- Vitest must ignore `**/._*`
- Phone: playable first screen; details may hide behind a fold; no second app
- Spec wins: `docs/superpowers/specs/2026-09-19-optional-life-commitments-design.md` over the 2026-09-18 spec where they disagree
- After each task: `npm test` green, then commit (no `--no-verify`)

This is **one plan, three shippable slices**. Do not start slice 2 until slice 1 tests pass on a playable dashboard. Do not start slice 3 until slice 2 HUD is playable on a phone-width layout.

| Slice | After it, the game… |
|---|---|
| 1 (Tasks 1–5) | Splits rent/living, can buy/dismiss a house, win check is net worth, default target ₹75L |
| 2 (Tasks 6–7) | FD 5%, noisy ~12% equity, FD→market, three-bucket HUD that works on a phone |
| 3 (Tasks 8–10) | Car, marriage slider, one kid, taunts, full `ChoiceModal` |

---

## File map

| Path | Responsibility |
|---|---|
| `src/engine/types.ts` | `Phase` + `awaitingChoice`, `Loan`, `House`, `PendingChoice`, `ChoiceInput`, `OfferedFlags`, `Ending` net-worth fields; remove live `fixedExpenses` |
| `src/engine/defaults.ts` | `DEFAULT_RENT`, target ₹75L, loan/return constants |
| `src/engine/state.ts` | `startGame` splits rent/living; commitment fields; `bankruptWipe` lives in economy |
| `src/engine/loans.ts` | `emi`, `amortize`, `downPayment`, `canAffordDownPayment`, `homePrincipal` |
| `src/engine/choices.ts` | Catalogs, `maybeChoice`, `openChoice`, `resolveChoice` |
| `src/engine/returns.ts` | `equityFactor`, `applyReturns` |
| `src/engine/netWorth.ts` | `liveNetWorth`, `emergencyTarget`, `homeEquity` |
| `src/engine/economy.ts` | Paycheck outflows + EMI amortize; `transferToMarket`; bankrupt forfeits house/loans |
| `src/engine/tick.ts` | Choice pause; `continueMonth(state, rng)`; `payPending(state, rng)` |
| `src/engine/ending.ts` | Net-worth win check |
| `src/engine/bosses.ts` | `applyBossEffect(state, boss)`; rent-spike vs living; `expenseMul` on living+rent |
| `src/engine/finishMonth` (in `tick.ts`) | Increment `childMonths`; school bump at 36 |
| `src/store/gameStore.ts` | `resolveChoice`, `openChoice`, `transferToMarket`; pass `Math.random` into `payPending` |
| `src/ui/ChoiceModal.tsx` | House/car/marriage/kid/taunt sheet |
| `src/ui/Dashboard.tsx` | Net worth, buckets, Details fold, life buttons |
| `src/ui/EndReceipt.tsx` | Cash + home equity + net worth |
| `src/ui/SetupScreen.tsx` | Default target from `DEFAULT_SETUP` (no extra fields) |
| `src/App.tsx` | Render `ChoiceModal` when `awaitingChoice` |
| `docs/PROJECT.md` | Live rules after slice 3 |

Do not add a debug skip-to-end. Do not add save/load.

---

### Task 1: Types, defaults, rent split at startGame

**Files:**
- Modify: `src/engine/types.ts`
- Modify: `src/engine/defaults.ts`
- Modify: `src/engine/state.ts`
- Modify: `src/engine/state.test.ts`
- Modify: `src/engine/economy.ts` (only enough to compile: paycheck uses `livingExpenses + rent`)
- Modify: `src/engine/economy.test.ts`
- Modify: `src/engine/bosses.ts`
- Modify: `src/engine/bosses.test.ts`
- Modify: `src/ui/Dashboard.tsx` (read `livingExpenses` and `rent` instead of `fixedExpenses`)
- Modify: `src/engine/ending.ts` (add `homeEquity: 0`, `netWorth: afterTax` placeholders so `Ending` type-checks; real formula is Task 4)

**Interfaces:**
- Consumes: existing `SetupConfig.fixedExpenses`
- Produces: `GameState.livingExpenses`, `GameState.rent`, `loans`, `house`, `married`, `hasChild`, `childMonths`, `schoolStarted`, `pendingChoice`, `offered`; `Phase` includes `'awaitingChoice'`; `Ending.homeEquity`, `Ending.netWorth`; `DEFAULT_RENT = 25_000`; `DEFAULT_SETUP.targetCorpusToday = 75_00_000`

- [ ] **Step 1: Write the failing startGame split test**

Replace `src/engine/state.test.ts` `startGame` block with:

```ts
import { describe, expect, it } from 'vitest';
import { DEFAULT_RENT, DEFAULT_SETUP, STARTING_CASH } from './defaults';
import { pushLedger, resetToSetup, startGame } from './state';

describe('startGame', () => {
  it('opens July of the start age with cash and no boss', () => {
    const s = startGame(DEFAULT_SETUP);
    expect(s.phase).toBe('playing');
    expect(s.ageYears).toBe(25);
    expect(s.ageMonths).toBe(0);
    expect(s.yearsPlayed).toBe(0);
    expect(s.cashBuffer).toBe(STARTING_CASH);
    expect(s.portfolioValue).toBe(0);
    expect(s.ltcgRate).toBe(0.1);
    expect(s.needsAnnualBoss).toBe(false);
  });

  it('splits default expenses into rent 25000 and living 30000', () => {
    const s = startGame(DEFAULT_SETUP);
    expect(s.rent).toBe(DEFAULT_RENT);
    expect(s.livingExpenses).toBe(30_000);
    expect(s.loans).toEqual([]);
    expect(s.house).toBeNull();
    expect(s.married).toBe(false);
    expect(s.hasChild).toBe(false);
    expect(s.childMonths).toBeNull();
    expect(s.schoolStarted).toBe(false);
    expect(s.pendingChoice).toBeNull();
    expect(s.offered).toEqual({ house: false, car: false, marriage: false, kid: false });
  });

  it('caps rent at expenses when setup expenses are below DEFAULT_RENT', () => {
    const s = startGame({ ...DEFAULT_SETUP, fixedExpenses: 20_000 });
    expect(s.rent).toBe(20_000);
    expect(s.livingExpenses).toBe(0);
  });
});
```

Leave `pushLedger` and `resetToSetup` tests as they are.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/engine/state.test.ts`

Expected: FAIL (`rent` / `livingExpenses` undefined, or `DEFAULT_RENT` not exported).

- [ ] **Step 3: Write types, defaults, startGame, and migrate callers so `tsc` is clean**

`src/engine/defaults.ts` — add and change target:

```ts
export const DEFAULT_RENT = 25_000;
export const HOME_ANNUAL_RATE = 0.08;
export const HOME_YEARS = 20;
export const CAR_ANNUAL_RATE = 0.10;
export const CAR_YEARS = 5;
export const DOWN_PAYMENT_RATE = 0.2;
export const FD_ANNUAL_RATE = 0.05;
export const HOUSE_ANNUAL_APPRECIATION = 0.05;
```

Set `DEFAULT_SETUP.targetCorpusToday` to `75_00_000`. Keep `MONTHLY_RETURN = 1.01` until Task 6.

`src/engine/types.ts` — replace `Phase`, `LedgerKind`, `Ending`, and `GameState` (keep `SetupConfig`, events, bosses, `Rng`):

```ts
export type Phase =
  | 'setup'
  | 'playing'
  | 'awaitingEvent'
  | 'awaitingBoss'
  | 'awaitingChoice'
  | 'ended';

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
  ageMonths: number;
  yearsPlayed: number;
  cashBuffer: number;
  portfolioValue: number;
  investedAmount: number;
  monthlySalary: number;
  livingExpenses: number;
  rent: number;
  plannedSip: number;
  ltcgRate: number;
  pendingEvent: PendingEvent | null;
  pendingBoss: PendingBoss | null;
  pendingChoice: PendingChoice | null;
  needsAnnualBoss: boolean;
  loans: Loan[];
  house: House | null;
  married: boolean;
  hasChild: boolean;
  childMonths: number | null;
  schoolStarted: boolean;
  offered: OfferedFlags;
  ledger: LedgerEntry[];
  ledgerSeq: number;
  isPaused: boolean;
  tickSpeed: 1 | 2 | 4;
  ending: Ending | null;
};
```

`src/engine/state.ts` — in `startGame`:

```ts
import { DEFAULT_RENT } from './defaults';

const rent = Math.min(DEFAULT_RENT, setup.fixedExpenses);
return {
  // existing fields except fixedExpenses
  livingExpenses: setup.fixedExpenses - rent,
  rent,
  pendingChoice: null,
  loans: [],
  house: null,
  married: false,
  hasChild: false,
  childMonths: null,
  schoolStarted: false,
  offered: { house: false, car: false, marriage: false, kid: false },
};
```

`src/engine/economy.ts` — `bankruptEnding` add `homeEquity: 0`, `netWorth: 0`. Paycheck:

```ts
const outflow = state.livingExpenses + state.rent;
```

Ledger two lines: `'Living expenses'` / `'Rent'` (skip rent line when `rent === 0`).

`src/engine/economy.test.ts` — paycheck surplus test unchanged numerically (55k total). Liquidation fixture:

```ts
livingExpenses: 40_000,
rent: 0,
```

instead of `fixedExpenses: 40_000`.

`src/engine/bosses.ts` — change signature to `applyBossEffect(state: GameState, boss: PendingBoss)`:

```ts
export function applyBossEffect(state: GameState, boss: PendingBoss): GameState {
  const effect = boss.effect;
  switch (effect.type) {
    case 'salaryMul':
      return { ...state, monthlySalary: Math.round(state.monthlySalary * effect.factor) };
    case 'expenseAdd': {
      if (boss.id === 'rent-spike' && state.rent > 0) {
        return { ...state, rent: state.rent + effect.amount };
      }
      return { ...state, livingExpenses: state.livingExpenses + effect.amount };
    }
    case 'expenseMul':
      return {
        ...state,
        livingExpenses: Math.round(state.livingExpenses * effect.factor),
        rent: state.rent > 0 ? Math.round(state.rent * effect.factor) : 0,
      };
    case 'setLtcg':
      return { ...state, ltcgRate: effect.rate };
    case 'oneShotBill':
    case 'flavour':
      return state;
  }
}
```

`src/engine/tick.ts` — `applyBossAndFinish` must call `applyBossEffect(state, boss)` (whole boss, not `boss.effect`).

`src/engine/bosses.test.ts` — `applyBossEffect(startGame(DEFAULT_SETUP), boss)` (already passing a boss in year-2 test via `boss.effect` — change to pass `boss`).

`src/engine/ending.ts` — compute as today but set `homeEquity: 0`, `netWorth: afterTax` (Task 4 replaces this). Callers of `Ending` must include the new fields.

`src/ui/Dashboard.tsx` — replace `fixedExpenses` with:

```tsx
const livingExpenses = useGameStore((s) => s.livingExpenses);
const rent = useGameStore((s) => s.rent);
// ...
<p className="text-[var(--expense)]">Living −{formatInr(livingExpenses)}</p>
{rent > 0 ? (
  <p className="text-[var(--expense)]">Rent −{formatInr(rent)}</p>
) : (
  <p className="text-[var(--muted)]">Rent: owned</p>
)}
```

- [ ] **Step 4: Run tests and typecheck**

Run: `npm test` and `npx tsc -b --pretty false`

Expected: PASS. `state.test.ts` split cases pass. Existing economy/tick/ending tests pass (ending still ignores house).

- [ ] **Step 5: Commit**

```bash
git add src/engine/types.ts src/engine/defaults.ts src/engine/state.ts src/engine/state.test.ts src/engine/economy.ts src/engine/economy.test.ts src/engine/bosses.ts src/engine/bosses.test.ts src/engine/tick.ts src/engine/ending.ts src/ui/Dashboard.tsx
git commit -m "$(cat <<'EOF'
Split live expenses into rent and living for optional home loans.

EOF
)"
```

---

### Task 2: Loan math

**Files:**
- Create: `src/engine/loans.ts`
- Create: `src/engine/loans.test.ts`

**Interfaces:**
- Consumes: `DOWN_PAYMENT_RATE`, `STCG_RATE`, `HOME_ANNUAL_RATE`, `HOME_YEARS`, `CAR_ANNUAL_RATE`, `CAR_YEARS`
- Produces:

```ts
export function downPayment(price: number): number;
export function emi(principal: number, annualRate: number, years: number): number;
export function amortize(loan: Loan): Loan | null; // null means paid off this month
export function canAffordDownPayment(cash: number, portfolio: number, price: number): boolean;
export function homePrincipal(loans: Loan[]): number;
export function originateLoan(kind: LoanKind, principal: number, annualRate: number, years: number): Loan;
```

- [ ] **Step 1: Write failing tests**

`src/engine/loans.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { CAR_ANNUAL_RATE, CAR_YEARS, HOME_ANNUAL_RATE, HOME_YEARS } from './defaults';
import { amortize, canAffordDownPayment, downPayment, emi, homePrincipal, originateLoan } from './loans';

describe('emi', () => {
  it('matches the spec table for the 2 BHK loan', () => {
    expect(downPayment(80_00_000)).toBe(16_00_000);
    expect(emi(64_00_000, HOME_ANNUAL_RATE, HOME_YEARS)).toBe(53_532);
  });

  it('matches 3 BHK, premium, and car rows', () => {
    expect(emi(88_00_000, HOME_ANNUAL_RATE, HOME_YEARS)).toBe(73_607);
    expect(emi(1_28_00_000, HOME_ANNUAL_RATE, HOME_YEARS)).toBe(1_07_064);
    expect(emi(4_00_000, CAR_ANNUAL_RATE, CAR_YEARS)).toBe(8_499);
    expect(emi(8_00_000, CAR_ANNUAL_RATE, CAR_YEARS)).toBe(16_998);
    expect(emi(16_00_000, CAR_ANNUAL_RATE, CAR_YEARS)).toBe(33_995);
  });
});

describe('canAffordDownPayment', () => {
  it('is true when cash covers 20%', () => {
    expect(canAffordDownPayment(16_00_000, 0, 80_00_000)).toBe(true);
  });

  it('counts STCG haircut on the shortfall', () => {
    expect(canAffordDownPayment(6_00_000, 12_00_000, 80_00_000)).toBe(true);
    expect(canAffordDownPayment(6_00_000, 11_99_999, 80_00_000)).toBe(false);
  });
});

describe('amortize', () => {
  it('reaches principal 0 after 240 home payments', () => {
    let loan = originateLoan('home', 64_00_000, HOME_ANNUAL_RATE, HOME_YEARS);
    expect(loan.emi).toBe(53_532);
    for (let i = 0; i < 240; i += 1) {
      const next = amortize(loan);
      if (next === null) {
        expect(i).toBe(239);
        expect(homePrincipal([])).toBe(0);
        return;
      }
      loan = next;
    }
    throw new Error('loan still alive after 240 months');
  });
});
```

Shortfall math: down 16L, cash 6L, shortfall 10L, need `round(10L * 1.20) = 12L` portfolio.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/engine/loans.test.ts`

Expected: FAIL (module not found).

- [ ] **Step 3: Implement `src/engine/loans.ts`**

```ts
import { DOWN_PAYMENT_RATE, STCG_RATE } from './defaults';
import type { Loan, LoanKind } from './types';

export function downPayment(price: number): number {
  return Math.round(price * DOWN_PAYMENT_RATE);
}

export function emi(principal: number, annualRate: number, years: number): number {
  const r = annualRate / 12;
  const n = years * 12;
  const growth = (1 + r) ** n;
  return Math.round((principal * r * growth) / (growth - 1));
}

export function originateLoan(
  kind: LoanKind,
  principal: number,
  annualRate: number,
  years: number,
): Loan {
  const monthsTotal = years * 12;
  return {
    kind,
    originalPrincipal: principal,
    principalRemaining: principal,
    annualRate,
    emi: emi(principal, annualRate, years),
    monthsTotal,
    monthsRemaining: monthsTotal,
  };
}

export function amortize(loan: Loan): Loan | null {
  const interest = Math.round(loan.principalRemaining * (loan.annualRate / 12));
  const principalPaid = Math.min(Math.max(loan.emi - interest, 0), loan.principalRemaining);
  const principalRemaining = loan.principalRemaining - principalPaid;
  const monthsRemaining = loan.monthsRemaining - 1;
  if (principalRemaining <= 0 || monthsRemaining <= 0) {
    return null;
  }
  return { ...loan, principalRemaining, monthsRemaining };
}

export function canAffordDownPayment(cash: number, portfolio: number, price: number): boolean {
  const down = downPayment(price);
  if (cash >= down) {
    return true;
  }
  const shortfall = down - cash;
  return portfolio >= Math.round(shortfall * (1 + STCG_RATE));
}

export function homePrincipal(loans: Loan[]): number {
  return loans.find((loan) => loan.kind === 'home')?.principalRemaining ?? 0;
}
```

If the 240-loop test fails because the last month returns a 0-principal loan instead of `null`, treat `principalRemaining === 0` as `null`. If EMI table is off by ₹1, **do not** hand-edit EMI; fix rounding in `emi` until the spec table matches (the spec numbers were produced with this formula).

- [ ] **Step 4: Run tests**

Run: `npm test -- src/engine/loans.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine/loans.ts src/engine/loans.test.ts
git commit -m "$(cat <<'EOF'
Add reducing-balance EMI math for home and car loans.

EOF
)"
```

---

### Task 3: Paycheck EMIs, amortize, bankrupt forfeits house

**Files:**
- Modify: `src/engine/economy.ts`
- Modify: `src/engine/economy.test.ts`
- Create: `src/engine/netWorth.ts` (only `homeEquity` helper if you need it here; full file is Task 4)

**Interfaces:**
- Consumes: `amortize`, `Loan`
- Produces: `applyPaycheck` deducts `living + rent + sum(emi)`, amortizes only if not bankrupt; `liquidate` wipe sets `house: null`, `loans: []`, `pendingChoice: null`

- [ ] **Step 1: Write failing tests**

Add to `src/engine/economy.test.ts`:

```ts
import { HOME_ANNUAL_RATE, HOME_YEARS } from './defaults';
import { originateLoan } from './loans';

it('deducts living, rent, and EMI then amortizes when cash covers it', () => {
  const loan = originateLoan('home', 64_00_000, HOME_ANNUAL_RATE, HOME_YEARS);
  const next = applyPaycheck({
    ...withCash(0),
    livingExpenses: 30_000,
    rent: 0,
    loans: [loan],
    monthlySalary: 1_00_000,
  });
  expect(next.cashBuffer).toBe(0 + 1_00_000 - 30_000 - loan.emi);
  expect(next.loans[0]?.principalRemaining).toBeLessThan(loan.principalRemaining);
  expect(next.phase).not.toBe('ended');
});

it('forfeits house and loans on bankrupt', () => {
  const loan = originateLoan('home', 64_00_000, HOME_ANNUAL_RATE, HOME_YEARS);
  const next = applyPaycheck({
    ...withCash(0, 0),
    monthlySalary: 10_000,
    livingExpenses: 30_000,
    rent: 0,
    loans: [loan],
    house: { tierId: 'bhk2', purchasePrice: 80_00_000, currentValue: 80_00_000 },
  });
  expect(next.phase).toBe('ended');
  expect(next.ending?.result).toBe('bankrupt');
  expect(next.house).toBeNull();
  expect(next.loans).toEqual([]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/engine/economy.test.ts`

Expected: FAIL (EMI not deducted / house still present).

- [ ] **Step 3: Implement paycheck + wipe**

In `liquidate`, when wiping:

```ts
house: null,
loans: [],
pendingChoice: null,
```

and `ending.homeEquity = 0`, `ending.netWorth = 0`.

`applyPaycheck`:

```ts
const emiTotal = state.loans.reduce((sum, loan) => sum + loan.emi, 0);
const outflow = state.livingExpenses + state.rent + emiTotal;
let next = pushLedger(
  { ...state, cashBuffer: state.cashBuffer + state.monthlySalary - outflow },
  'salary',
  'Salary credited',
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
```

Do **not** amortize when `phase === 'ended'`.

- [ ] **Step 4: Run tests**

Run: `npm test -- src/engine/economy.test.ts`

Expected: PASS. Principal after one month is `6400000 - (53532 - round(6400000 * 0.08 / 12))`.

- [ ] **Step 5: Commit**

```bash
git add src/engine/economy.ts src/engine/economy.test.ts
git commit -m "$(cat <<'EOF'
Charge EMIs with the paycheck and forfeit the house on bankrupt.

EOF
)"
```

---

### Task 4: Net-worth ending

**Files:**
- Create: `src/engine/netWorth.ts`
- Create: `src/engine/netWorth.test.ts`
- Modify: `src/engine/ending.ts`
- Modify: `src/engine/ending.test.ts`
- Modify: `src/ui/EndReceipt.tsx`
- Modify: `src/ui/SetupScreen.tsx` (only if it hardcodes 40L; it should already bind `DEFAULT_SETUP`)

**Interfaces:**
- Consumes: `homePrincipal`, `GameState`, `INFLATION_RATE`
- Produces:

```ts
export function homeEquity(state: GameState): number;
export function liveNetWorth(state: GameState): number;
export function emergencyTarget(state: GameState): number;
```

`evaluateEnding` uses `netWorth = afterTaxPortfolio + cash + homeEquity`, then `real = round(netWorth / 1.07 ** yearsPlayed)`.

- [ ] **Step 1: Write failing tests**

`src/engine/netWorth.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { DEFAULT_SETUP } from './defaults';
import { originateLoan } from './loans';
import { emergencyTarget, homeEquity, liveNetWorth } from './netWorth';
import { HOME_ANNUAL_RATE, HOME_YEARS } from './defaults';
import { startGame } from './state';

describe('netWorth helpers', () => {
  it('counts house value minus home principal and ignores a car loan', () => {
    const home = originateLoan('home', 64_00_000, HOME_ANNUAL_RATE, HOME_YEARS);
    const car = originateLoan('car', 4_00_000, 0.1, 5);
    const state = {
      ...startGame(DEFAULT_SETUP),
      portfolioValue: 10_00_000,
      cashBuffer: 2_00_000,
      house: { tierId: 'bhk2' as const, purchasePrice: 80_00_000, currentValue: 85_00_000 },
      loans: [home, car],
    };
    expect(homeEquity(state)).toBe(85_00_000 - home.principalRemaining);
    expect(liveNetWorth(state)).toBe(10_00_000 + 2_00_000 + (85_00_000 - home.principalRemaining));
  });

  it('is 12× of living + rent + EMIs', () => {
    const home = originateLoan('home', 64_00_000, HOME_ANNUAL_RATE, HOME_YEARS);
    const state = {
      ...startGame(DEFAULT_SETUP),
      livingExpenses: 30_000,
      rent: 0,
      loans: [home],
    };
    expect(emergencyTarget(state)).toBe(12 * (30_000 + home.emi));
  });
});
```

`src/engine/ending.test.ts` — change the 20-year case to include house + cash in `real`, and compare against `setup.targetCorpusToday` (now 75L):

```ts
it('discounts after-tax net worth by 7% for 20 years', () => {
  const home = originateLoan('home', 10_00_000, HOME_ANNUAL_RATE, HOME_YEARS);
  const state = {
    ...startGame(DEFAULT_SETUP),
    yearsPlayed: 20,
    portfolioValue: 1_64_00_000,
    investedAmount: 72_00_000,
    ltcgRate: 0.125,
    cashBuffer: 12_000,
    house: { tierId: 'bhk2' as const, purchasePrice: 80_00_000, currentValue: 80_00_000 },
    loans: [{ ...home, principalRemaining: 10_00_000 }],
  };
  const ending = evaluateEnding(state);
  const gains = 1_64_00_000 - 72_00_000;
  const tax = Math.round(gains * 0.125);
  const afterTax = Math.round(1_64_00_000 - tax);
  const equity = 80_00_000 - 10_00_000;
  const netWorth = afterTax + 12_000 + equity;
  const real = Math.round(netWorth / 1.07 ** 20);
  expect(ending.homeEquity).toBe(equity);
  expect(ending.netWorth).toBe(netWorth);
  expect(ending.cashLeft).toBe(12_000);
  expect(ending.realPurchasingPower).toBe(real);
  expect(ending.result).toBe(real >= DEFAULT_SETUP.targetCorpusToday ? 'win' : 'lose');
});
```

Keep the second test (tiny target 1 vs 10L). Import `originateLoan`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/engine/netWorth.test.ts src/engine/ending.test.ts`

Expected: FAIL (module missing and/or `real` still portfolio-only).

- [ ] **Step 3: Implement**

`src/engine/netWorth.ts`:

```ts
import { homePrincipal } from './loans';
import type { GameState } from './types';

export function homeEquity(state: GameState): number {
  if (!state.house) {
    return 0;
  }
  return Math.max(state.house.currentValue - homePrincipal(state.loans), 0);
}

export function liveNetWorth(state: GameState): number {
  return state.portfolioValue + state.cashBuffer + homeEquity(state);
}

export function emergencyTarget(state: GameState): number {
  const emiTotal = state.loans.reduce((sum, loan) => sum + loan.emi, 0);
  return 12 * (state.livingExpenses + state.rent + emiTotal);
}
```

`evaluateEnding`:

```ts
import { homeEquity } from './netWorth';

export function evaluateEnding(state: GameState): Ending {
  const gross = state.portfolioValue;
  const gains = Math.max(gross - state.investedAmount, 0);
  const tax = Math.round(gains * state.ltcgRate);
  const afterTax = Math.round(gross - tax);
  const equity = homeEquity(state);
  const netWorth = afterTax + state.cashBuffer + equity;
  const real = Math.round(netWorth / (1 + INFLATION_RATE) ** state.yearsPlayed);
  const result = real >= state.setup.targetCorpusToday ? 'win' : 'lose';
  return {
    result,
    yearsPlayed: state.yearsPlayed,
    grossPortfolio: gross,
    investedAmount: state.investedAmount,
    ltcgRate: state.ltcgRate,
    tax,
    afterTax,
    cashLeft: state.cashBuffer,
    homeEquity: equity,
    netWorth,
    realPurchasingPower: real,
    targetCorpusToday: state.setup.targetCorpusToday,
  };
}
```

`EndReceipt.tsx` — after after-tax, add Cash, Home equity (or “Rented”), Net worth; then inflation; then real vs target. Remove “Cash left (not counted)”. If you want a car footnote, show it only when `useGameStore(s => s.loans.some(l => l.kind === 'car')) ||` you cannot know sold cars — skip the footnote until Task 8 sets a `ownedCar` flag. For now no car footnote.

Add `ownedCar: boolean` on `GameState` in Task 8, not now.

- [ ] **Step 4: Run tests**

Run: `npm test -- src/engine/netWorth.test.ts src/engine/ending.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine/netWorth.ts src/engine/netWorth.test.ts src/engine/ending.ts src/engine/ending.test.ts src/ui/EndReceipt.tsx
git commit -m "$(cat <<'EOF'
Judge FIRE on inflation-adjusted net worth including home equity.

EOF
)"
```

---

### Task 5: House choice in the tick + minimal modal

**Files:**
- Create: `src/engine/choices.ts`
- Create: `src/engine/choices.test.ts`
- Modify: `src/engine/tick.ts`
- Modify: `src/engine/tick.test.ts`
- Modify: `src/store/gameStore.ts`
- Create: `src/ui/ChoiceModal.tsx`
- Modify: `src/App.tsx`
- Modify: `src/ui/Dashboard.tsx` (net worth headline + House button)

**Interfaces:**
- Consumes: `canAffordDownPayment`, `downPayment`, `originateLoan`, `payBill`, `HOUSE` catalog
- Produces:

```ts
export const HOUSE_TIERS: { id: HouseTierId; label: string; price: number }[];
export function payableHouseTiers(state: GameState): HouseTierId[];
export function maybeChoice(state: GameState): GameState;
export function openChoice(state: GameState, kind: ChoiceKind): GameState;
export function resolveChoice(state: GameState, input: ChoiceInput, rng: Rng): GameState;
```

`continueMonth(state, rng)` and `payPending(state, rng)` must take `rng` for the SIP/returns tail. Store `tick` already passes `Math.random`; `payPending` in the store must too.

`maybeChoice` this task: **house only**. Car/marriage/kid/taunt return state unchanged until later tasks (functions may exist as stubs that only handle `'house'`).

Priority when those exist later: marriage > kid > house > car > taunt. Implement the order now so later tasks only add branches.

- [ ] **Step 1: Write failing engine tests**

`src/engine/choices.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { DEFAULT_SETUP } from './defaults';
import { maybeChoice, openChoice } from './choices';
import { startGame } from './state';
import { resolveChoice, tick } from './tick';

const noopRng = () => 0.5;
const neverEvent = () => 0.99;

describe('house choice', () => {
  it('does not unlock 2 BHK when cash and portfolio cannot pay 16L after STCG', () => {
    const s = maybeChoice({ ...startGame(DEFAULT_SETUP), cashBuffer: 1_00_000, portfolioValue: 1_00_000 });
    expect(s.pendingChoice).toBeNull();
    expect(openChoice(s, 'house').phase).toBe(s.phase);
  });

  it('auto-pauses the first month 2 BHK is payable from cash', () => {
    const s = maybeChoice({ ...startGame(DEFAULT_SETUP), cashBuffer: 16_00_000 });
    expect(s.phase).toBe('awaitingChoice');
    expect(s.pendingChoice?.kind).toBe('house');
    expect(s.offered.house).toBe(true);
  });

  it('buys 2 BHK from cash, zeros rent, and originates the 64L loan', () => {
    const paused = maybeChoice({ ...startGame(DEFAULT_SETUP), cashBuffer: 20_00_000, livingExpenses: 30_000, rent: 25_000 });
    const next = resolveChoice(paused, { action: 'accept', tierId: 'bhk2' }, noopRng);
    expect(next.house?.tierId).toBe('bhk2');
    expect(next.house?.currentValue).toBe(80_00_000);
    expect(next.rent).toBe(0);
    expect(next.cashBuffer).toBe(20_00_000 - 16_00_000);
    expect(next.loans[0]?.kind).toBe('home');
    expect(next.loans[0]?.principalRemaining).toBe(64_00_000);
    expect(next.loans[0]?.emi).toBe(53_532);
    expect(next.pendingChoice).toBeNull();
  });

  it('uses STCG sell when cash is 6L and portfolio is large', () => {
    const paused = maybeChoice({
      ...startGame(DEFAULT_SETUP),
      cashBuffer: 6_00_000,
      portfolioValue: 50_00_000,
      investedAmount: 50_00_000,
    });
    const next = resolveChoice(paused, { action: 'accept', tierId: 'bhk2' }, noopRng);
    expect(next.house).not.toBeNull();
    expect(next.cashBuffer).toBe(0);
    expect(next.portfolioValue).toBe(50_00_000 - Math.round(10_00_000 * 1.2));
  });

  it('dismisses with no rupee movement and keeps rent', () => {
    const paused = maybeChoice({ ...startGame(DEFAULT_SETUP), cashBuffer: 16_00_000, rent: 25_000 });
    const next = resolveChoice(paused, { action: 'dismiss' }, noopRng);
    expect(next.house).toBeNull();
    expect(next.rent).toBe(25_000);
    expect(next.cashBuffer).toBe(16_00_000);
    expect(next.pendingChoice).toBeNull();
  });

  it('does not auto-pause every month after dismiss, but July reminder does', () => {
    let s = maybeChoice({ ...startGame(DEFAULT_SETUP), cashBuffer: 16_00_000 });
    s = resolveChoice(s, { action: 'dismiss' }, noopRng);
    const again = maybeChoice({ ...s, phase: 'playing', cashBuffer: 16_00_000 });
    expect(again.phase).not.toBe('awaitingChoice');
    const july = maybeChoice({
      ...s,
      phase: 'playing',
      cashBuffer: 16_00_000,
      ageMonths: 0,
      yearsPlayed: 1,
    });
    expect(july.phase).toBe('awaitingChoice');
    expect(july.pendingChoice?.kind).toBe('house');
  });

  it('tick is a no-op in awaitingChoice', () => {
    const paused = maybeChoice({ ...startGame(DEFAULT_SETUP), cashBuffer: 16_00_000 });
    expect(tick(paused, neverEvent)).toEqual(paused);
  });
});
```

If `resolveChoice` runs the month tail (SIP/returns), cash after a 20L buy will not stay at 4L. **Spec:** after accept/dismiss, run the same tail as `continueMonth` (SIP → returns → maybe boss → finish). Tests that assert exact cash must either set `plannedSip: 0` or assert `house` / `rent` / loan and treat SIP as `min(plannedSip, cashAfterDown)`. Put `plannedSip: 0` on those fixtures.

Down payment must use `payBill` (cash then STCG). Ledger kind `choice` for the purchase line is allowed; `payBill` currently uses `'event'` — keep `payBill` and accept an `event` ledger line, or add an optional kind later. Do not invent a second liquidate path.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/engine/choices.test.ts`

Expected: FAIL (module not found).

- [ ] **Step 3: Implement catalogs, maybeChoice, resolveChoice, tick rng**

`src/engine/choices.ts` (house-only accept; other kinds dismiss/no-op):

```ts
export const HOUSE_TIERS = [
  { id: 'bhk2' as const, label: '2 BHK', price: 80_00_000 },
  { id: 'bhk3' as const, label: '3 BHK', price: 1_10_00_000 },
  { id: 'premium' as const, label: 'Premium 3 BHK', price: 1_60_00_000 },
];

export function payableHouseTiers(state: GameState): HouseTierId[] {
  return HOUSE_TIERS.filter((tier) =>
    canAffordDownPayment(state.cashBuffer, state.portfolioValue, tier.price),
  ).map((tier) => tier.id);
}

function housePending(state: GameState): GameState {
  const payableTierIds = payableHouseTiers(state);
  if (payableTierIds.length === 0) {
    return state;
  }
  return {
    ...state,
    pendingChoice: {
      kind: 'house',
      title: 'Ghar le lo',
      copy: 'Broker says inventory is moving. EMI replaces rent. Relatives already know.',
      payableTierIds,
    },
    phase: 'awaitingChoice',
    offered: { ...state.offered, house: true },
  };
}

export function maybeChoice(state: GameState): GameState {
  if (state.phase === 'ended' || state.house) {
    return state;
  }
  const payable = payableHouseTiers(state).includes('bhk2');
  if (!payable) {
    return state;
  }
  if (!state.offered.house) {
    return housePending(state);
  }
  if (state.ageMonths === 0 && state.yearsPlayed > 0) {
    return housePending(state);
  }
  return state;
}

export function openChoice(state: GameState, kind: ChoiceKind): GameState {
  if (state.phase !== 'playing') {
    return state;
  }
  if (kind === 'house' && !state.house && payableHouseTiers(state).length > 0) {
    return housePending(state);
  }
  return state;
}

export function resolveChoice(state: GameState, input: ChoiceInput, rng: Rng): GameState {
  if (state.phase !== 'awaitingChoice' || !state.pendingChoice) {
    return state;
  }
  let next: GameState = { ...state, pendingChoice: null, phase: 'playing' };
  if (input.action === 'accept' && state.pendingChoice.kind === 'house') {
    const tier = HOUSE_TIERS.find((row) => row.id === input.tierId);
    if (!tier || !payableHouseTiers(state).includes(tier.id)) {
      return state;
    }
    const down = downPayment(tier.price);
    next = payBill(state, down, `Home down payment · ${tier.label}`);
    if (next.phase === 'ended') {
      return { ...next, pendingChoice: null };
    }
    const principal = tier.price - down;
    next = {
      ...next,
      pendingChoice: null,
      phase: 'playing',
      rent: 0,
      house: { tierId: tier.id, purchasePrice: tier.price, currentValue: tier.price },
      loans: [...next.loans, originateLoan('home', principal, HOME_ANNUAL_RATE, HOME_YEARS)],
    };
    next = pushLedger(next, 'choice', `Bought ${tier.label}`, 0);
  }
  return continueMonthTail(next, rng);
}
```

Put `continueMonthTail` in `tick.ts` and import it from `choices.ts` **or** keep tail inside `tick.ts` and have `resolveChoice` live in `tick.ts`. Prefer: `choices.ts` only mutates commitment fields; `tick.ts` exports `continueMonthTail` and `resolveChoice` wraps apply + tail to avoid a cycle.

**Avoid the cycle:** `choices.ts` exports `applyChoice(state, input): GameState` (no tail). `tick.ts` exports `resolveChoice` that calls `applyChoice` then `continueMonthTail`. Tests import `resolveChoice` from `tick.ts` and `maybeChoice` / `openChoice` from `choices.ts`.

`continueMonth`:

```ts
export function continueMonthTail(state: GameState, rng: Rng): GameState {
  let next = applySip(state);
  next = compound(next); // Task 6 swaps for applyReturns(next, rng)
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
  const applied = applyChoice(state, input);
  if (applied.phase === 'ended' || applied.phase === 'awaitingChoice') {
    return applied;
  }
  return continueMonthTail(applied, rng);
}
```

`applyChoice` on dismiss: `{ ...state, pendingChoice: null, phase: 'playing' }`.

Store:

```ts
payPending: () => set(payPending(get(), Math.random)),
resolveChoice: (input: ChoiceInput) => set(resolveChoice(get(), input, Math.random)),
openChoice: (kind: ChoiceKind) => set(openChoiceEngine(get(), kind)),
```

Import engine `openChoice` as `openChoiceEngine`.

`ChoiceModal.tsx` (house only): full-viewport on small screens (`fixed inset-0`, `w-full max-w-md md:rounded-lg h-full md:h-auto`), list `HOUSE_TIERS`, enable button if `payableTierIds.includes(id)`, show down + EMI using `downPayment` / `emi` / `HOME_*`. Buttons: **Buy** per payable row, **Keep renting** → `resolveChoice({ action: 'dismiss' })`.

`App.tsx`: `{phase === 'awaitingChoice' && <ChoiceModal />}`.

`Dashboard.tsx`: top number `liveNetWorth(s)` (subscribe to the fields, or call `liveNetWorth` on the selected slice). Smaller line under it: `Portfolio {formatInr(portfolioValue)}`. If `!house && payableHouseTiers(state).length` show **House** calling `openChoice('house')`.

`tick.test.ts` `completeQuietMonth`:

```ts
import { resolveChoice } from './tick';

function completeQuietMonth(state: GameState): GameState {
  let next = tick(state, neverEvent);
  if (next.phase === 'awaitingChoice') {
    next = resolveChoice(next, { action: 'dismiss' }, neverEvent);
  }
  if (next.phase === 'awaitingBoss' || next.phase === 'awaitingEvent') {
    next = payPending(next, neverEvent);
  }
  return next;
}
```

The 240-month loop must use `payPending(s, neverEvent)` and dismiss `awaitingChoice`. Defaults will not hit ₹16L cash, but this keeps the test honest.

- [ ] **Step 4: Run tests**

Run: `npm test`

Expected: PASS including `choices.test.ts` and `tick.test.ts`.

- [ ] **Step 5: Manual check then commit**

`npm run dev`. Start defaults. Confirm dashboard shows net worth and living/rent. Not required to buy a house this task.

```bash
git add src/engine/choices.ts src/engine/choices.test.ts src/engine/tick.ts src/engine/tick.test.ts src/store/gameStore.ts src/ui/ChoiceModal.tsx src/ui/Dashboard.tsx src/App.tsx
git commit -m "$(cat <<'EOF'
Pause for an optional house when the 2 BHK down payment is payable.

EOF
)"
```

**Slice 1 gate:** `npm test` green. Game still idles. House modal appears only if you cut SIP and save ₹16L (or tests).

---

### Task 6: FD, noisy equity, house 5%, transfer

**Files:**
- Create: `src/engine/returns.ts`
- Create: `src/engine/returns.test.ts`
- Modify: `src/engine/economy.ts` (add `transferToMarket`; stop using `compound` from tick)
- Modify: `src/engine/economy.test.ts` (move/replace `compound` 1% test)
- Modify: `src/engine/tick.ts` (`continueMonthTail` calls `applyReturns(next, rng)`)
- Modify: `src/store/gameStore.ts`

**Interfaces:**
- Consumes: `Rng`, `FD_ANNUAL_RATE`, `HOUSE_ANNUAL_APPRECIATION`
- Produces:

```ts
export function equityFactor(rng: Rng): number; // 1 + 0.01 + 0.04 * (rng() - 0.5)
export function applyReturns(state: GameState, rng: Rng): GameState;
export function transferToMarket(state: GameState, amount: number): GameState;
```

- [ ] **Step 1: Write failing tests**

`src/engine/returns.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { DEFAULT_SETUP } from './defaults';
import { applyReturns, equityFactor } from './returns';
import { transferToMarket } from './economy';
import { startGame } from './state';

describe('equityFactor', () => {
  it('is 0.99 at rng 0, 1.01 at 0.5, and ~1.03 at 0.999', () => {
    expect(equityFactor(() => 0)).toBe(0.99);
    expect(equityFactor(() => 0.5)).toBe(1.01);
    expect(equityFactor(() => 0.999)).toBeCloseTo(1.02996, 5);
  });
});

describe('applyReturns', () => {
  it('marks portfolio, FD, and house', () => {
    const rng = () => 0.5;
    const next = applyReturns(
      {
        ...startGame(DEFAULT_SETUP),
        portfolioValue: 100_000,
        cashBuffer: 100_000,
        house: { tierId: 'bhk2', purchasePrice: 80_00_000, currentValue: 80_00_000 },
      },
      rng,
    );
    expect(next.portfolioValue).toBe(101_000);
    expect(next.cashBuffer).toBe(Math.round(100_000 * 1.05 ** (1 / 12)));
    expect(next.house?.currentValue).toBe(Math.round(80_00_000 * 1.05 ** (1 / 12)));
  });
});

describe('transferToMarket', () => {
  it('moves cash into portfolio and basis, clamped', () => {
    const s = { ...startGame(DEFAULT_SETUP), cashBuffer: 50_000, portfolioValue: 10_000, investedAmount: 10_000 };
    const next = transferToMarket(s, 80_000);
    expect(next.cashBuffer).toBe(0);
    expect(next.portfolioValue).toBe(60_000);
    expect(next.investedAmount).toBe(60_000);
  });
});
```

Delete or retarget `compound` test in `economy.test.ts` (if `compound` remains, keep it as a 1% helper; tick must not call it).

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/engine/returns.test.ts`

Expected: FAIL.

- [ ] **Step 3: Implement**

```ts
// returns.ts
export function equityFactor(rng: Rng): number {
  return 1 + 0.01 + 0.04 * (rng() - 0.5);
}

export function applyReturns(state: GameState, rng: Rng): GameState {
  const portfolioValue = Math.round(state.portfolioValue * equityFactor(rng));
  const cashBuffer = Math.round(state.cashBuffer * 1.05 ** (1 / 12));
  const house = state.house
    ? { ...state.house, currentValue: Math.round(state.house.currentValue * 1.05 ** (1 / 12)) }
    : null;
  return { ...state, portfolioValue, cashBuffer, house };
}
```

Do not ledger these ticks.

```ts
export function transferToMarket(state: GameState, amount: number): GameState {
  const moved = Math.max(0, Math.min(Math.round(amount), state.cashBuffer));
  if (moved === 0) {
    return state;
  }
  return pushLedger(
    {
      ...state,
      cashBuffer: state.cashBuffer - moved,
      portfolioValue: state.portfolioValue + moved,
      investedAmount: state.investedAmount + moved,
    },
    'transfer',
    'Shifted FD to market',
    -moved,
  );
}
```

Store: `transferToMarket: (amount: number) => set(transferToMarket(get(), amount))` with engine import aliased.

`continueMonthTail`: `applyReturns(next, rng)` instead of `compound`.

- [ ] **Step 4: Run `npm test`**

Expected: PASS. The 240-month test still ends (`applyReturns` uses the test rng `0.99` → factor `1.0296`, portfolio grows faster — still not `awaitingChoice` on defaults).

- [ ] **Step 5: Commit**

```bash
git add src/engine/returns.ts src/engine/returns.test.ts src/engine/economy.ts src/engine/economy.test.ts src/engine/tick.ts src/store/gameStore.ts
git commit -m "$(cat <<'EOF'
Compound the FD at 5% and let equity noise sit around 12%.

EOF
)"
```

---

### Task 7: HUD — three buckets, phone fold, transfer control

**Files:**
- Modify: `src/ui/Dashboard.tsx`
- Modify: `src/ui/BufferGauge.tsx` (FD gauge vs 12×, not salary)
- Modify: `src/ui/SetupScreen.tsx` (`max-w-xl` already; make inputs `w-full` and button `w-full sm:w-auto`)
- Modify: `src/ui/ChoiceModal.tsx` (ensure primary button `min-h-11 w-full`)

**Interfaces:**
- Consumes: `liveNetWorth`, `emergencyTarget`, `transferToMarket`, `openChoice`, loan fields
- Produces: playable phone first screen

- [ ] **Step 1: No Vitest UI tests (v1 rule). Implement the layout described here, then smoke in the browser.**

Dashboard structure:

```tsx
<header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] pb-3">
  {/* month · age */}
  <div className="text-right">
    <AnimatedNumber value={liveNetWorth({ ... })} className="text-2xl font-semibold text-[var(--money)]" />
    <p className="text-xs text-[var(--muted)]">Portfolio {formatInr(portfolioValue)}</p>
  </div>
  {/* theme, pause, 1x 2x 4x */}
</header>

<section className="grid gap-4 md:grid-cols-2">
  {/* inflows: salary, living, rent/owned, SIP slider, House button if eligible */}
</section>

{/* md+: three columns; <md: cash + SIP already visible; rest in Details */}
<div className="hidden gap-4 md:grid md:grid-cols-3">
  <InvestmentCard value={portfolioValue} />
  <EmiCard loans={loans} />
  <FdCard cash={cashBuffer} target={emergencyTarget(state)} onTransfer={transferToMarket} />
</div>

<details className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 md:hidden">
  <summary className="cursor-pointer text-sm font-medium">Details</summary>
  <div className="mt-4 grid gap-4">
    <InvestmentCard value={portfolioValue} />
    <EmiCard loans={loans} />
    <FdCard cash={cashBuffer} target={emergencyTarget(state)} onTransfer={transferToMarket} />
    <LedgerFeed entries={ledger} />
  </div>
</details>

<div className="hidden md:block">
  <LedgerFeed entries={ledger} />
</div>
```

You may keep these cards in `Dashboard.tsx` or split `src/ui/FdCard.tsx` / `src/ui/EmiCard.tsx` if the file grows past ~200 lines.

`FdCard`: show cash, “FD ~5%”, number input + **Shift to market** (amount clamped in engine). Gauge fill = `cash / emergencyTarget` capped at 100%. Amber label when `cash < target` (`text-amber-400`). Never disable SIP or transfer.

`EmiCard`: each loan `Home EMI {formatInr(emi)} · {monthsRemaining}m left · {formatInr(principalRemaining)}` or “No EMIs. Relatives have notices.”

`BufferGauge`: change props to `{ cash, target }` and fill vs `target` (not salary). Use it inside `FdCard` or replace it.

Phone-width smoke: pause, speed, SIP, pay a life event still works with Details closed. Transfer only inside Details.

Setup: `className="w-full"` on inputs; Start `w-full min-h-11`.

- [ ] **Step 2: Verify in the browser**

`npm run dev` at ~375px and ~1280px. Start defaults. Pause. Open Details on phone. Change SIP. Pay nothing if no event.

- [ ] **Step 3: `npm test` then commit**

```bash
git add src/ui/Dashboard.tsx src/ui/BufferGauge.tsx src/ui/SetupScreen.tsx src/ui/ChoiceModal.tsx src/ui/FdCard.tsx src/ui/EmiCard.tsx
git commit -m "$(cat <<'EOF'
Show investments, EMIs, and FD on desktop and behind Details on a phone.

EOF
)"
```

Only `git add` files that exist.

**Slice 2 gate:** phone can play; FD shift works; equity noise visible over a few 4x months.

---

### Task 8: Car

**Files:**
- Modify: `src/engine/choices.ts`
- Modify: `src/engine/choices.test.ts`
- Modify: `src/engine/types.ts` (`ownedCar: boolean`)
- Modify: `src/engine/state.ts` (`ownedCar: false`)
- Modify: `src/engine/ending.ts` / `EndReceipt.tsx` (footnote if `ownedCar`)
- Modify: `src/ui/ChoiceModal.tsx`
- Modify: `src/ui/Dashboard.tsx` (Car button)

**Interfaces:**
- Consumes: `originateLoan('car', …)`, `CAR_ANNUAL_RATE`, `CAR_YEARS`
- Produces: `CAR_TIERS`, `payableCarTiers`, `maybeChoice` car branch after house, `applyChoice` car, `ownedCar`

Car is **not** in `liveNetWorth` / `homeEquity`.

Unlock when **used** (₹5L) down payment is payable. One car. EMI extra. First pause / HUD / July same as house.

`maybeChoice` order:

```ts
export function maybeChoice(state: GameState): GameState {
  const marriage = maybeMarriage(state); // Task 9; until then identity
  if (marriage.phase === 'awaitingChoice') return marriage;
  const kid = maybeKid(state); // Task 9 identity
  if (kid.phase === 'awaitingChoice') return kid;
  const house = maybeHouse(state);
  if (house.phase === 'awaitingChoice') return house;
  const car = maybeCar(state);
  if (car.phase === 'awaitingChoice') return car;
  return maybeTaunt(state); // Task 10 identity
}
```

Until Task 9/10, `maybeMarriage` / `maybeKid` / `maybeTaunt` are `return state`.

- [ ] **Step 1: Write failing tests in `choices.test.ts`**

```ts
describe('car choice', () => {
  it('unlocks used when 1L down is payable and does not add car value to net worth', () => {
    const paused = maybeChoice({
      ...startGame(DEFAULT_SETUP),
      cashBuffer: 1_00_000,
      offered: { house: true, car: false, marriage: false, kid: false },
      house: { tierId: 'bhk2', purchasePrice: 80_00_000, currentValue: 80_00_000 },
      rent: 0,
    });
    expect(paused.pendingChoice?.kind).toBe('car');
    const next = resolveChoice(paused, { action: 'accept', tierId: 'used' }, () => 0.5);
    expect(next.ownedCar).toBe(true);
    expect(next.loans.some((l) => l.kind === 'car' && l.emi === 8_499)).toBe(true);
    expect(liveNetWorth(next)).toBe(liveNetWorth({ ...next, loans: next.loans.filter((l) => l.kind !== 'car'), ownedCar: false }));
  });
});
```

The net-worth assertion: compare `liveNetWorth(next)` to portfolio+cash+homeEquity of `next` (car principal must not be subtracted). `liveNetWorth` already ignores car principal if `homePrincipal` only sums `kind === 'home'`. Assert:

```ts
expect(liveNetWorth(next)).toBe(next.portfolioValue + next.cashBuffer + homeEquity(next));
```

Set `plannedSip: 0` so the tail does not sip.

```ts
  it('dismisses a car with no loan and July reminder after dismiss', () => {
    const paused = maybeChoice({
      ...startGame(DEFAULT_SETUP),
      cashBuffer: 1_00_000,
      plannedSip: 0,
      offered: { house: true, car: false, marriage: false, kid: false },
      house: { tierId: 'bhk2', purchasePrice: 80_00_000, currentValue: 80_00_000 },
      rent: 0,
    });
    expect(paused.pendingChoice?.kind).toBe('car');
    const dismissed = resolveChoice(paused, { action: 'dismiss' }, () => 0.5);
    expect(dismissed.ownedCar).toBe(false);
    expect(dismissed.loans.some((l) => l.kind === 'car')).toBe(false);
    const midYear = maybeChoice({ ...dismissed, phase: 'playing', cashBuffer: 1_00_000 });
    expect(midYear.pendingChoice).toBeNull();
    const july = maybeChoice({
      ...dismissed,
      phase: 'playing',
      cashBuffer: 1_00_000,
      ageMonths: 0,
      yearsPlayed: 1,
    });
    expect(july.pendingChoice?.kind).toBe('car');
  });
```

- [ ] **Step 2: Run tests — expect FAIL** (`ownedCar` missing / car not applied).

- [ ] **Step 3: Implement `CAR_TIERS`**

```ts
export const CAR_TIERS = [
  { id: 'used' as const, label: 'Used', price: 5_00_000 },
  { id: 'new' as const, label: 'New', price: 10_00_000 },
  { id: 'suv' as const, label: 'SUV', price: 20_00_000 },
];
```

`applyChoice` car: `payBill(down)`, `originateLoan('car', price-down, CAR_ANNUAL_RATE, CAR_YEARS)`, `ownedCar: true`. Refuse if `ownedCar` or tier not payable (return original awaitingChoice state).

`ChoiceModal`: if `kind === 'car'`, same three-row picker. Dashboard **Car** button via `openChoice('car')`.

`EndReceipt`: if `ownedCar`, muted line “Car does not count.”

- [ ] **Step 4: `npm test` PASS**

- [ ] **Step 5: Commit**

```bash
git add src/engine/choices.ts src/engine/choices.test.ts src/engine/types.ts src/engine/state.ts src/engine/ending.ts src/ui/ChoiceModal.tsx src/ui/Dashboard.tsx src/ui/EndReceipt.tsx
git commit -m "$(cat <<'EOF'
Add an optional car loan that never counts toward FIRE.

EOF
)"
```

---

### Task 9: Marriage and one kid

**Files:**
- Modify: `src/engine/choices.ts`
- Modify: `src/engine/choices.test.ts`
- Modify: `src/engine/tick.ts` (`finishMonth` child + school)
- Modify: `src/engine/defaults.ts` (wedding constants)
- Modify: `src/ui/ChoiceModal.tsx`
- Modify: `src/ui/Dashboard.tsx`

**Interfaces:**
- Produces:

```ts
export const WEDDING_MIN = 2_00_000;
export const WEDDING_MAX = 25_00_000;
export const WEDDING_STEP = 50_000;
export const WEDDING_RECOMMENDED = 8_00_000;
export const BIRTH_COST = 1_50_000;
export const KID_LIVING_BUMP = 12_000;
export const SCHOOL_LIVING_BUMP = 10_000;
export const SCHOOL_AFTER_MONTHS = 36;

export function weddingCopy(spend: number): string;
```

Marriage unlock: `ageYears >= 30 && !married`. Kid: `married && !hasChild` on a **later** month than the wedding (if you apply marriage in month M, `maybeKid` must not run until `finishMonth` has advanced). Easiest: set `offered.kid` unused; `maybeKid` requires `married && !hasChild && offered.marriage` already true **and** not still in the wedding modal; first kid offer on the next `maybeChoice` after a finished wedding month. Implement: `applyChoice` marriage sets `married: true` but does **not** call `maybeKid` in the same `maybeChoice`. Next month `beginMonth` → `continueMonth` → `maybeChoice` sees married and `!offered.kid` → kid pause.

Copy:

```ts
export function weddingCopy(spend: number): string {
  if (spend < 5_00_000) {
    return 'Spouse has been staring at the laminated menu. Relatives sent a condolence GIF.';
  }
  if (spend <= 10_00_000) {
    return 'Respectable. The aunties will still talk.';
  }
  return 'Izzat delivered. The FD is a husk.';
}
```

- [ ] **Step 1: Write failing tests**

```ts
describe('marriage and kid', () => {
  it('does not offer marriage before age 30', () => {
    const s = maybeChoice({ ...startGame(DEFAULT_SETUP), ageYears: 29, cashBuffer: 20_00_000 });
    expect(s.pendingChoice?.kind === 'marriage').toBe(false);
  });

  it('offers marriage at 30, spend 3L sets married and sad copy, decline does not', () => {
    const paused = maybeChoice({ ...startGame(DEFAULT_SETUP), ageYears: 30, cashBuffer: 20_00_000, plannedSip: 0 });
    expect(paused.pendingChoice?.kind).toBe('marriage');
    const declined = resolveChoice(paused, { action: 'dismiss' }, () => 0.5);
    expect(declined.married).toBe(false);
    const done = resolveChoice(paused, { action: 'accept', spend: 3_00_000 }, () => 0.5);
    expect(done.married).toBe(true);
    expect(done.ledger.some((e) => e.text.includes('laminated') || e.text.includes('condolence'))).toBe(true);
  });

  it('offers kid the month after marriage, not the same month', () => {
    const paused = maybeChoice({ ...startGame(DEFAULT_SETUP), ageYears: 30, cashBuffer: 20_00_000, plannedSip: 0 });
    const married = resolveChoice(paused, { action: 'accept', spend: 8_00_000 }, () => 0.5);
    expect(married.pendingChoice).toBeNull();
    expect(married.hasChild).toBe(false);
    const nextMonth = maybeChoice({ ...married, phase: 'playing' });
    expect(nextMonth.pendingChoice?.kind).toBe('kid');
  });

  it('birth bill and +12000 living, school +10000 at childMonths 36', () => {
    const kidPause = maybeChoice({
      ...startGame(DEFAULT_SETUP),
      married: true,
      offered: { house: true, car: true, marriage: true, kid: false },
      cashBuffer: 5_00_000,
      plannedSip: 0,
      livingExpenses: 30_000,
    });
    const born = resolveChoice(kidPause, { action: 'accept' }, () => 0.5);
    expect(born.hasChild).toBe(true);
    expect(born.livingExpenses).toBe(42_000);
    expect(born.childMonths).toBe(0);
    let s = born;
    for (let i = 0; i < 36; i += 1) {
      s = finishMonth({ ...s, phase: 'playing', pendingChoice: null });
    }
    expect(s.childMonths).toBe(36);
    expect(s.schoolStarted).toBe(true);
    expect(s.livingExpenses).toBe(52_000);
  });
});
```

Export `finishMonth` from `tick.ts` (already exported). `finishMonth` currently sets `phase: 'playing'` and may **end the game** if age hits retirement — keep fixtures at age 30.

If `resolveChoice` tail calls `finishMonth`, `childMonths` might already be 1 after birth. Spec: increment in `finishMonth` whenever `hasChild`. Birth sets `childMonths = 0` then tail `finishMonth` → 1 in the same month. Then the school test’s 36 loops would overshoot.

**Lock this behavior in the test you write:** after `resolveChoice` accept kid, if `childMonths === 1` because tail finished the month, loop **35** more `finishMonth` calls to reach 36, **or** set `childMonths = 0` in `applyChoice` and increment only in `finishMonth`, and have `resolveChoice` still run the tail.

Implement increment only in `finishMonth`:

```ts
if (bumped.hasChild && bumped.childMonths !== null) {
  const childMonths = bumped.childMonths + 1;
  let livingExpenses = bumped.livingExpenses;
  let schoolStarted = bumped.schoolStarted;
  if (childMonths === 36 && !schoolStarted) {
    livingExpenses += 10_000;
    schoolStarted = true;
    bumped = pushLedger({ ...bumped, childMonths, livingExpenses, schoolStarted }, 'system', 'School fees begin', -10_000);
  } else {
    bumped = { ...bumped, childMonths };
  }
}
```

Then the birth month tail **does** increment to 1. Test: after accept, `childMonths === 1` if tail ran, `livingExpenses === 42000`. Call `finishMonth` until `childMonths === 36` (35 more if already 1). Write the test to loop `while (s.childMonths !== 36) finishMonth` with a guard.

- [ ] **Step 2: Tests FAIL**

- [ ] **Step 3: Implement marriage/kid in `applyChoice` / `maybeMarriage` / `maybeKid`**

Accept marriage: clamp spend to `[WEDDING_MIN, WEDDING_MAX]` stepped; if not payable, return original `awaitingChoice` state. `payBill(spend, weddingCopy(spend))`, `married: true`. Slider default `WEDDING_RECOMMENDED`.

Kid accept: `payBill(BIRTH_COST)`, `hasChild: true`, `childMonths: 0`, `livingExpenses += 12_000`.

`ChoiceModal` marriage: `<input type="range" min={200000} max={2500000} step={50000} />` plus recommended chip. Kid: **Yes, bacche** / **Not yet**.

Dashboard buttons **Shaadi** / **Bacche** via `openChoice`.

`tick.test.ts` 240-month loop already dismisses `awaitingChoice` — marriage at 30 will pause and be dismissed. Good.

- [ ] **Step 4: `npm test` PASS**

- [ ] **Step 5: Commit**

```bash
git commit -m "$(cat <<'EOF'
Add optional marriage spend and a single kid with a school bump.

EOF
)"
```

---

### Task 10: Taunts, copy, PROJECT.md

**Files:**
- Modify: `src/engine/choices.ts`
- Modify: `src/engine/choices.test.ts`
- Modify: `src/ui/ChoiceModal.tsx`
- Modify: `docs/PROJECT.md`
- Modify: `docs/superpowers/specs/2026-09-19-optional-life-commitments-design.md` only if implementation forced a spec clarifier (school increment). If `childMonths` hits 36 via finishMonth including birth month, add one sentence to the spec stating that.

**Interfaces:**
- `maybeTaunt(state)` last in `maybeChoice`
- Conditions: missing house OR (`ageYears >= 27` && !married) OR (married && !hasChild) OR !ownedCar
- Month: `(ageMonths === 0 || ageMonths === 6) && !(yearsPlayed === 0 && ageMonths === 0)`
- Skip if a higher-priority offer is due (already guaranteed if taunt is last and others returned awaitingChoice)
- `PendingChoice` kind `taunt`; `applyChoice` dismiss and accept both just clear (₹0)
- Modal button **Continue** only

Copy (join 1–3 lines with newlines):

- !house: `Ghar kab le rahe ho? Rent receipt is not an heirloom.`
- !married && ageYears >= 27: `Shaadi kab kar rahe ho? Relatives have formed a committee.`
- married && !hasChild: `Bacche kab? Your mother forwarded a baby reel.`
- !ownedCar: `Car kab? Cab receipts do not impress the colony.`

- [ ] **Step 1: Write failing tests**

```ts
describe('taunts', () => {
  it('does not debit cash in January when still renting', () => {
    const s = maybeChoice({
      ...startGame(DEFAULT_SETUP),
      ageMonths: 6,
      yearsPlayed: 0,
      cashBuffer: 50_000,
      offered: { house: true, car: true, marriage: true, kid: true },
    });
    expect(s.pendingChoice?.kind).toBe('taunt');
    const next = resolveChoice(s, { action: 'dismiss' }, () => 0.5);
    expect(next.cashBuffer).toBe(50_000);
  });

  it('does not taunt opening July', () => {
    const s = maybeChoice({
      ...startGame(DEFAULT_SETUP),
      offered: { house: true, car: true, marriage: true, kid: true },
    });
    expect(s.pendingChoice).toBeNull();
  });

  it('does not steal the slot when house is newly payable', () => {
    const s = maybeChoice({
      ...startGame(DEFAULT_SETUP),
      ageMonths: 6,
      cashBuffer: 16_00_000,
      offered: { house: false, car: true, marriage: true, kid: true },
    });
    expect(s.pendingChoice?.kind).toBe('house');
  });
});
```

First test sets `offered.house: true` so July/Jan house reminder does not fire (`maybeHouse` July reminder needs `ageMonths === 0 && yearsPlayed > 0` **or** !offered.house). January `ageMonths === 6` with `offered.house true` and cash 50k: house not payable at 16L, so not house. Car used needs 1L — cash 50k is not enough. Taunt should fire.

Wait: cash 50_000 cannot pay used car 1L. House 16L no. Good, taunt.

Opening July: `yearsPlayed 0 && ageMonths 0` — no taunt even if missing everything. But `!offered.house` and cash 50k is not payable so `maybeHouse` no. `maybeTaunt` blocked by opening July. `pendingChoice` null. Good.

- [ ] **Step 2: FAIL then implement `maybeTaunt`**

- [ ] **Step 3: ChoiceModal taunt = copy + Continue (`resolveChoice({ action: 'dismiss' })`)**

- [ ] **Step 4: Update `docs/PROJECT.md` live rules**

Replace the “not implemented yet” sentence with the new live rules:

- Live expenses: `livingExpenses + rent`; buying a house sets `rent = 0`
- Win: inflation-adjusted after-tax portfolio + cash + home equity; default target ₹75L
- Optional house/car/marriage/kid; flavour taunts ₹0
- Cash is FD at `1.05**(1/12)` monthly; equity `1 + 0.01 + 0.04*(rng-0.5)`; player `transferToMarket`
- New phase `awaitingChoice`; store `resolveChoice` / `openChoice` / `transferToMarket`
- Phone: first screen playable; Details fold for EMI/FD/ledger
- File map rows for `loans.ts`, `choices.ts`, `returns.ts`, `netWorth.ts`, `ChoiceModal.tsx`
- Known issue: retune if default-skip-everything still always wins; house EMI is the intended tightness

Keep: engine owns money; no monthly cash reset; no auto-invest leftover; no SIP liquidation; integer rupees; Vitest `**/._*`.

- [ ] **Step 5: `npm test` && `npm run build`**

Expected: both green.

- [ ] **Step 6: Browser smoke**

Phone and desktop: start, dismiss a taunt in January if you wait, cut SIP / add cash via test only if needed. Marriage at 30: slider, cheap copy. Kid yes. Confirm Details fold.

- [ ] **Step 7: Commit**

```bash
git add src/engine/choices.ts src/engine/choices.test.ts src/ui/ChoiceModal.tsx docs/PROJECT.md docs/superpowers/specs/2026-09-19-optional-life-commitments-design.md
git commit -m "$(cat <<'EOF'
Roast skipped milestones for free and document the live commitment rules.

EOF
)"
```

---

## Manual smoke (after Task 10)

1. Desktop 1280: defaults, 4x, survive an event, SIP slider, FD transfer, receipt shows cash + equity lines.
2. Phone 375: same without opening Details except to transfer.
3. Save ~₹16L (drop SIP to 0) → house modal → 2 BHK → rent owned, EMI line, net worth jumps.
4. Age 30 → shaadi → ₹3L sad copy; next month bacche → living +12k.
5. Dismiss all → January/July taunt, ₹0.

---

## Self-review (plan vs spec)

| Spec section | Task |
|---|---|
| Rent split, EMI replaces rent | 1, 5 |
| Loan EMI table, amortize, STCG down payment | 2, 5 |
| Bankrupt forfeits house | 3 |
| Net worth win, ₹75L, cash in pile, car excluded | 4, 8 |
| House 5%, FD 5%, equity noise, transfer one-way, 12× advice | 6, 7 |
| HUD buckets + phone Details | 7 |
| Car loan 10%/5y | 8 |
| Marriage slider + copy, kid bumps, school at 36 month-ends | 9 |
| Taunts ₹0, priority, not opening July | 10 |
| `awaitingChoice`, GameLoop skips non-playing | 5 (phase) |
| Engine tests listed in spec §12 | 2–6, 8–10 |
| `openChoice` only from `playing` | 5 |
| Boss rent-spike / expenseMul | 1 |
| PROJECT.md | 10 |
