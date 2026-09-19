# Honest Money and Action Dock Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cap SIP to investable cash, gate house/car life events and unaffordable offers, show EMIs on the month card, and replace blocking event/choice scrims with a top ActionDock plus an opt-in picker.

**Architecture:** Keep the three layers. Engine gains `canPayFromBalance`, `sipCap` / `clampPlannedSip`, and `eligibleLifeEvents`. Zustand stays thin (`setSip` clamp, `choicePickerOpen`). React adds `ActionDock`; `ChoiceModal` opens only after Choose / HUD click for house, car, and shaadi.

**Tech Stack:** Vite 6, React 19, TypeScript strict, Tailwind CSS 3, Zustand 5, Vitest (node). No React Testing Library.

## Global Constraints

- TypeScript strict; no `any`
- Money and phase logic stay in `src/engine/`; Zustand only wraps
- Do not reset cash monthly, auto-invest leftover buffer, or liquidate to fund SIP
- Tick order: paycheck → optional event → SIP → compound → optional July boss → then increment age
- Integer rupees after multiply (`Math.round`)
- Dark theme default; colors from `src/index.css` tokens
- Vitest must ignore `**/._*`
- Spec: `docs/superpowers/specs/2026-09-20-honest-money-and-action-dock-design.md` (wins over 2026-09-19)
- Cancel-subscription bills are out of scope
- Do not retune default salary/SIP/win rates

---

## File map

Do not invent extra files. `EventModal.tsx` is removed once `ActionDock` pays events and bosses.

| Path | Responsibility |
|---|---|
| `src/engine/loans.ts` | Add `canPayFromBalance`; `canAffordDownPayment` delegates |
| `src/engine/loans.test.ts` | Balance-cover tests |
| `src/engine/economy.ts` | `sipCap`, `clampPlannedSip` |
| `src/engine/economy.test.ts` | Cap / clamp tests |
| `src/engine/events.ts` | `eligibleLifeEvents`, `pickLifeEvent(state, rng)` |
| `src/engine/events.test.ts` | Ownership gates |
| `src/engine/tick.ts` | Pass state into pick; skip if pool empty |
| `src/engine/choices.ts` | Marriage/kid money gate; clamp after accept |
| `src/engine/choices.test.ts` | Gate tests; fix cash on July reminders |
| `src/store/gameStore.ts` | Clamp `setSip`; `choicePickerOpen` |
| `src/store/gameStore.test.ts` | Clamp and picker flag |
| `src/ui/ActionDock.tsx` | Full-width pending strip |
| `src/ui/Dashboard.tsx` | Dock, EMI lines, SIP max, button gates |
| `src/ui/ChoiceModal.tsx` | House/car/marriage picker + Back |
| `src/App.tsx` | No EventModal; ChoiceModal if picker open |
| `src/ui/EventModal.tsx` | Delete |
| `docs/PROJECT.md` | SIP cap, event gates, dock |

---

### Task 1: `canPayFromBalance`

**Files:**
- Modify: `src/engine/loans.ts`
- Test: `src/engine/loans.test.ts`

**Interfaces:**
- Consumes: `STCG_RATE`, existing `downPayment`
- Produces: `canPayFromBalance(cash: number, portfolio: number, amount: number): boolean` — true if `cash >= amount`, else if `portfolio >= Math.round((amount - cash) * (1 + STCG_RATE))`. Amount `<= 0` is true. `canAffordDownPayment(cash, portfolio, price)` becomes `canPayFromBalance(cash, portfolio, downPayment(price))`.

- [ ] **Step 1: Write the failing tests**

Add to `src/engine/loans.test.ts` (keep existing `canAffordDownPayment` cases):

```ts
import { amortize, canAffordDownPayment, canPayFromBalance, downPayment, emi, homePrincipal, originateLoan } from './loans';

describe('canPayFromBalance', () => {
  it('is true when cash covers the amount', () => {
    expect(canPayFromBalance(2_00_000, 0, 2_00_000)).toBe(true);
  });

  it('counts STCG haircut on the shortfall', () => {
    expect(canPayFromBalance(1_00_000, 1_20_000, 2_00_000)).toBe(true);
    expect(canPayFromBalance(1_00_000, 1_19_999, 2_00_000)).toBe(false);
  });

  it('is true for non-positive amount', () => {
    expect(canPayFromBalance(0, 0, 0)).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/engine/loans.test.ts`

Expected: FAIL — `canPayFromBalance` is not exported.

- [ ] **Step 3: Implement**

In `src/engine/loans.ts`, add and switch the down-payment helper:

```ts
export function canPayFromBalance(cash: number, portfolio: number, amount: number): boolean {
  if (amount <= 0) {
    return true;
  }
  if (cash >= amount) {
    return true;
  }
  const shortfall = amount - cash;
  return portfolio >= Math.round(shortfall * (1 + STCG_RATE));
}

export function canAffordDownPayment(cash: number, portfolio: number, price: number): boolean {
  return canPayFromBalance(cash, portfolio, downPayment(price));
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/engine/loans.test.ts`

Expected: PASS (including existing down-payment cases).

- [ ] **Step 5: Commit**

```bash
git add src/engine/loans.ts src/engine/loans.test.ts
git commit -m "Add a shared cash-then-STCG affordability helper."
```

---

### Task 2: SIP cap and clamp

**Files:**
- Modify: `src/engine/economy.ts`, `src/engine/choices.ts`, `src/engine/tick.ts`, `src/store/gameStore.ts`
- Test: `src/engine/economy.test.ts`, `src/store/gameStore.test.ts`

**Interfaces:**
- Consumes: `GameState`, `canPayFromBalance` (not required here)
- Produces:
  - `sipCap(state: GameState): number`
  - `clampPlannedSip(state: GameState): GameState` with `plannedSip = min(plannedSip, sipCap(state))`, never below 0
  - This-month SIP still pending when `phase === 'awaitingEvent'` or (`phase === 'awaitingChoice'` and `pendingChoice.source === 'auto'`): cap is `max(0, cashBuffer)`
  - Otherwise cap is `max(0, cashBuffer + monthlySalary - livingExpenses - rent - sum(emi))`
  - `applySip` stays `min(plannedSip, max(cashBuffer, 0))` and must not call `liquidate`
  - `applyChoice` accept paths return `clampPlannedSip(...)`
  - `finishMonth` school-fee bump returns `clampPlannedSip(...)`
  - Store `setSip` stores `min(round(amount), sipCap(get()))`

- [ ] **Step 1: Write the failing engine tests**

Add to `src/engine/economy.test.ts`:

```ts
import { applyPaycheck, applySip, clampPlannedSip, liquidate, payBill, sipCap } from './economy';

describe('sipCap', () => {
  it('in playing is leftover cash plus salary minus living, rent, and EMIs', () => {
    const loan = originateLoan('home', 64_00_000, HOME_ANNUAL_RATE, HOME_YEARS);
    const state = {
      ...withCash(10_000),
      livingExpenses: 30_000,
      rent: 25_000,
      loans: [loan],
      monthlySalary: 1_00_000,
      phase: 'playing' as const,
    };
    expect(sipCap(state)).toBe(10_000 + 1_00_000 - 30_000 - 25_000 - loan.emi);
  });

  it('uses leftover cash only when this month SIP is still pending', () => {
    const playing = withCash(80_000);
    const awaiting = { ...playing, phase: 'awaitingEvent' as const, cashBuffer: 90_000 };
    expect(sipCap(awaiting)).toBe(90_000);
    expect(sipCap(playing)).toBe(80_000 + 1_00_000 - 55_000);
  });

  it('snaps planned SIP down to the cap', () => {
    const next = clampPlannedSip({ ...withCash(10_000), plannedSip: 5_00_000, phase: 'playing' });
    expect(next.plannedSip).toBe(sipCap(next));
  });
});
```

Default `withCash` uses `startGame(DEFAULT_SETUP)`: salary ₹1,00,000, living ₹30,000, rent ₹25,000.

Add to `src/engine/choices.test.ts` (needs `sipCap` import from `../engine/economy` — use `from './economy'`):

```ts
import { sipCap } from './economy';

it('clamps planned SIP after a house purchase raises EMI', () => {
  const paused = openChoice(
    {
      ...startGame(DEFAULT_SETUP),
      cashBuffer: 16_00_000,
      plannedSip: 80_000,
    },
    'house',
  );
  const next = resolveChoice(paused, { action: 'accept', tierId: 'bhk2' }, noopRng);
  expect(next.house).not.toBeNull();
  expect(next.plannedSip).toBe(sipCap(next));
  expect(next.plannedSip).toBeLessThan(80_000);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/engine/economy.test.ts src/engine/choices.test.ts`

Expected: FAIL — `sipCap` / `clampPlannedSip` not exported; house accept leaves `plannedSip` at 80_000.

- [ ] **Step 3: Implement engine helpers**

In `src/engine/economy.ts`:

```ts
function monthlyOutflow(state: GameState): number {
  const emiTotal = state.loans.reduce((sum, loan) => sum + loan.emi, 0);
  return state.livingExpenses + state.rent + emiTotal;
}

function sipPendingThisMonth(state: GameState): boolean {
  return (
    state.phase === 'awaitingEvent' ||
    (state.phase === 'awaitingChoice' && state.pendingChoice?.source === 'auto')
  );
}

export function sipCap(state: GameState): number {
  if (sipPendingThisMonth(state)) {
    return Math.max(0, state.cashBuffer);
  }
  return Math.max(0, state.cashBuffer + state.monthlySalary - monthlyOutflow(state));
}

export function clampPlannedSip(state: GameState): GameState {
  const cap = sipCap(state);
  const plannedSip = Math.max(0, Math.min(state.plannedSip, cap));
  if (plannedSip === state.plannedSip) {
    return state;
  }
  return { ...state, plannedSip };
}
```

Do not change `applySip` beyond using existing `min(plannedSip, cash)`.

At the end of every **accept** branch in `applyChoice` (house, car, marriage, kid) that returns a playing state, wrap with `clampPlannedSip`. Import from `./economy`. Example house success return:

```ts
return clampPlannedSip(pushLedger(next, 'choice', `Bought ${tier.label}`, 0));
```

Same for car, marriage, and kid success returns (not bankrupt/no-op returns).

In `finishMonth`, after the school-fee living bump object is built, `bumped = clampPlannedSip(bumped)` (import from `./economy`).

- [ ] **Step 4: Run engine tests**

Run: `npx vitest run src/engine/economy.test.ts src/engine/choices.test.ts src/engine/tick.test.ts`

Expected: PASS.

- [ ] **Step 5: Clamp `setSip` in the store**

Add to `src/store/gameStore.test.ts`:

```ts
it('clamps SIP to investable cash, not full salary', () => {
  expect(useGameStore.getState().startGame(DEFAULT_SETUP)).toBe(true);
  useGameStore.getState().setSip(1_00_000);
  expect(useGameStore.getState().plannedSip).toBe(95_000);
});
```

`95_000` is start cash ₹50,000 + salary ₹1,00,000 − living ₹30,000 − rent ₹25,000.

Fail then implement in `src/store/gameStore.ts`:

```ts
import { sipCap, transferToMarket as transferToMarketEngine } from '../engine/economy';

setSip: (amount) => {
  const planned = Math.max(0, Math.round(amount));
  set({ plannedSip: Math.min(planned, sipCap(get())) });
},
```

Run: `npx vitest run src/store/gameStore.test.ts`

Expected: PASS. Existing `setSip(15_000)` still 15_000.

- [ ] **Step 6: Commit**

```bash
git add src/engine/economy.ts src/engine/economy.test.ts src/engine/choices.ts src/engine/choices.test.ts src/engine/tick.ts src/store/gameStore.ts src/store/gameStore.test.ts
git commit -m "Cap planned SIP to investable cash and snap it after EMI."
```

---

### Task 3: Gate life events to owned assets

**Files:**
- Modify: `src/engine/events.ts`, `src/engine/tick.ts`
- Test: `src/engine/events.test.ts`

**Interfaces:**
- Consumes: `GameState`, `Rng`, `LIFE_EVENTS`
- Produces:
  - `eligibleLifeEvents(state: GameState): PendingEvent[]`
  - `pickLifeEvent(state: GameState, rng: Rng): PendingEvent | null`
  - `society` and `plumber` require `house !== null`
  - `car-sensor` requires `ownedCar`
  - Uniform pick from the filtered list; `null` if empty
  - `beginMonth`: `pickLifeEvent(next, rng)`; if `null`, do not enter `awaitingEvent`

- [ ] **Step 1: Write the failing tests**

Replace the rng pick test and add gates in `src/engine/events.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { DEFAULT_SETUP } from './defaults';
import { eligibleLifeEvents, LIFE_EVENTS, pickLifeEvent } from './events';
import { startGame } from './state';

describe('LIFE_EVENTS', () => {
  it('has 15 events including the PRD four', () => {
    expect(LIFE_EVENTS).toHaveLength(15);
    expect(LIFE_EVENTS.map((e) => e.id)).toEqual(
      expect.arrayContaining(['wedding', 'root-canal', 'brewery', 'car-sensor']),
    );
  });

  it('picks by injected rng from the eligible pool', () => {
    const state = startGame(DEFAULT_SETUP);
    expect(pickLifeEvent(state, () => 0)?.id).toBe(eligibleLifeEvents(state)[0]?.id);
  });

  it('never picks house or car bills without those assets', () => {
    const state = startGame(DEFAULT_SETUP);
    const ids = Array.from({ length: 100 }, (_, i) => pickLifeEvent(state, () => i / 100)?.id);
    expect(ids).not.toContain('society');
    expect(ids).not.toContain('plumber');
    expect(ids).not.toContain('car-sensor');
  });

  it('allows those bills when the assets exist', () => {
    const state = {
      ...startGame(DEFAULT_SETUP),
      house: { tierId: 'bhk2' as const, purchasePrice: 80_00_000, currentValue: 80_00_000 },
      ownedCar: true,
    };
    const ids = eligibleLifeEvents(state).map((event) => event.id);
    expect(ids).toEqual(expect.arrayContaining(['society', 'plumber', 'car-sensor']));
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/engine/events.test.ts`

Expected: FAIL — arity of `pickLifeEvent` / missing `eligibleLifeEvents`.

- [ ] **Step 3: Implement**

`src/engine/events.ts`: change the import to `GameState, PendingEvent, Rng`. Leave the `LIFE_EVENTS` array exactly as it is. Replace `pickLifeEvent` and add:

```ts
export function eligibleLifeEvents(state: GameState): PendingEvent[] {
  return LIFE_EVENTS.filter((event) => {
    if (event.id === 'society' || event.id === 'plumber') {
      return state.house !== null;
    }
    if (event.id === 'car-sensor') {
      return state.ownedCar;
    }
    return true;
  });
}

export function pickLifeEvent(state: GameState, rng: Rng): PendingEvent | null {
  const pool = eligibleLifeEvents(state);
  if (pool.length === 0) {
    return null;
  }
  const index = Math.min(pool.length - 1, Math.floor(rng() * pool.length));
  return pool[index]!;
}
```

Keep the existing `LIFE_EVENTS` array body as-is.

In `src/engine/tick.ts` `beginMonth`:

```ts
  if (rng() < EVENT_CHANCE) {
    const event = pickLifeEvent(next, rng);
    if (event) {
      return { ...next, pendingEvent: event, phase: 'awaitingEvent' };
    }
  }
  return next;
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/engine/events.test.ts src/engine/tick.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine/events.ts src/engine/events.test.ts src/engine/tick.ts
git commit -m "Skip house and car life events until those assets exist."
```

---

### Task 4: Money-gate shaadi and bacche offers

**Files:**
- Modify: `src/engine/choices.ts`
- Test: `src/engine/choices.test.ts`

**Interfaces:**
- Consumes: `canPayFromBalance`, `WEDDING_MIN`, `BIRTH_COST`
- Produces: `maybeMarriage` / `openChoice(..., 'marriage')` no-op unless `canPayFromBalance(cash, portfolio, WEDDING_MIN)` (age ≥ 30 and not married still required). `maybeKid` / `openChoice(..., 'kid')` no-op unless `canPayFromBalance(..., BIRTH_COST)`. House/car stay on cheapest-tier down payment. July reminders use the same gates.

Existing test `keeps an unaffordable wedding awaiting a choice` is **wrong** under the new spec — replace it. July reminder tests that use default ₹50,000 cash must set cash/portfolio high enough to pay the minimum.

- [ ] **Step 1: Write the failing tests**

Replace the unaffordable-wedding test and add gates. Give July/kid reminder fixtures payable cash.

```ts
it('does not offer shaadi until the wedding floor is payable', () => {
  const s = maybeChoice({
    ...startGame(DEFAULT_SETUP),
    ageYears: 30,
    cashBuffer: 1_00_000,
    portfolioValue: 0,
    ownedCar: true,
  });
  expect(s.pendingChoice).toBeNull();
  expect(openChoice(s, 'marriage').phase).toBe('playing');
});

it('offers shaadi once cash plus STCG cover the floor', () => {
  const s = maybeChoice({
    ...startGame(DEFAULT_SETUP),
    ageYears: 30,
    cashBuffer: 2_00_000,
    ownedCar: true,
  });
  expect(s.pendingChoice?.kind).toBe('marriage');
});

it('does not offer a kid until the birth bill is payable', () => {
  const s = maybeChoice({
    ...startGame(DEFAULT_SETUP),
    ageYears: 30,
    married: true,
    cashBuffer: 50_000,
    portfolioValue: 0,
    ownedCar: true,
    offered: { house: true, car: true, marriage: true, kid: false },
  });
  expect(s.pendingChoice).toBeNull();
  expect(openChoice(s, 'kid').phase).toBe('playing');
});
```

Change `reminds about dismissed marriage in July` setup to include `cashBuffer: 20_00_000` on the first `maybeChoice` and keep that cash on july/midYear clones.

Change `reminds about a dismissed kid` to include `cashBuffer: 5_00_000`.

Delete `keeps an unaffordable wedding awaiting a choice` (accepting a huge wedding with tiny cash remains covered by `applyChoice` bankrupt/no-op if you still want a case: accepting 8L with 2L cash + 0 portfolio after a valid offer — optional; skip unless you keep a separate `applyChoice` test).

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/engine/choices.test.ts`

Expected: FAIL — shaadi still offered at ₹1L; kid still offered at ₹50k.

- [ ] **Step 3: Implement gates**

Import `canPayFromBalance` from `./loans`.

At the top of `maybeMarriage`, after the age/married checks:

```ts
  if (!canPayFromBalance(state.cashBuffer, state.portfolioValue, WEDDING_MIN)) {
    return state;
  }
```

At the top of `maybeKid`, after married/hasChild checks:

```ts
  if (!canPayFromBalance(state.cashBuffer, state.portfolioValue, BIRTH_COST)) {
    return state;
  }
```

In `openChoice` marriage branch, add the same `canPayFromBalance(..., WEDDING_MIN)` conjunct. Kid branch: `canPayFromBalance(..., BIRTH_COST)`.

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/engine/choices.test.ts`

Expected: PASS (including July reminders that now have enough cash).

- [ ] **Step 5: Commit**

```bash
git add src/engine/choices.ts src/engine/choices.test.ts
git commit -m "Hide shaadi and bacche until the minimum bill is payable."
```

---

### Task 5: HUD — EMI lines and SIP slider max

**Files:**
- Modify: `src/ui/Dashboard.tsx`

**Interfaces:**
- Consumes: `sipCap(state)` from `../engine/economy`; `loans` already on the store
- Produces: Inflows card lists each loan as `Home EMI −{formatInr(emi)}` / `Car EMI −{formatInr(emi)}`. SIP range `max={sipCap}` using current store fields (pass the store snapshot or selected fields into `sipCap`). Shaadi button: `ageYears >= 30 && !married && canPayFromBalance(cash, portfolio, WEDDING_MIN)`. Bacche: `married && !hasChild && canPayFromBalance(cash, portfolio, BIRTH_COST)`. House/car buttons stay on `payableHouseTiers` / `payableCarTiers`.

No RTL. Engine already deducts EMIs; this is display + slider.

- [ ] **Step 1: Add EMI rows and cap the slider**

In `Dashboard.tsx` imports:

```ts
import { BIRTH_COST, WEDDING_MIN } from '../engine/defaults';
import { sipCap } from '../engine/economy';
import { canPayFromBalance } from '../engine/loans';
```

Read `portfolioValue` (already used as net-worth sibling — add if missing). Compute:

```ts
  const cap = useGameStore(sipCap);
  const canOpenMarriage = useGameStore(
    (s) =>
      s.ageYears >= 30 &&
      !s.married &&
      canPayFromBalance(s.cashBuffer, s.portfolioValue, WEDDING_MIN),
  );
  const canOpenKid = useGameStore(
    (s) =>
      s.married &&
      !s.hasChild &&
      canPayFromBalance(s.cashBuffer, s.portfolioValue, BIRTH_COST),
  );
```

After the rent block, map loans:

```tsx
          {loans.map((loan) => (
            <p key={`${loan.kind}-${loan.monthsRemaining}`} className="text-[var(--expense)]">
              {loan.kind === 'home' ? 'Home EMI' : 'Car EMI'} −{formatInr(loan.emi)}
            </p>
          ))}
```

SIP input:

```tsx
            <input
              className="mt-2 w-full"
              type="range"
              min={0}
              max={Math.max(cap, 0)}
              step={1000}
              value={Math.min(plannedSip, cap)}
              onChange={(e) => setSip(Number(e.target.value))}
            />
```

If `cap === 0`, keep `max={0}` so the range is disabled-looking but valid. `setSip` already clamps.

- [ ] **Step 2: Typecheck**

Run: `npx tsc -b --pretty false`

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/ui/Dashboard.tsx
git commit -m "Show EMIs on the month card and cap the SIP slider."
```

---

### Task 6: ActionDock and opt-in picker

**Files:**
- Create: `src/ui/ActionDock.tsx`
- Modify: `src/ui/Dashboard.tsx`, `src/ui/ChoiceModal.tsx`, `src/App.tsx`, `src/store/gameStore.ts`, `src/store/gameStore.test.ts`
- Delete: `src/ui/EventModal.tsx`

**Interfaces:**
- Consumes: existing `payPending`, `resolveChoice`, `openChoice`, pending fields
- Produces: Store `choicePickerOpen: boolean`, `openChoicePicker(): void`, `closeChoicePicker(): void`. Picker open only for house/car/marriage while `phase === 'awaitingChoice'`. HUD `openChoice` sets picker true for those kinds. `resolveChoice` / `payPending` / `startGame` / `resetToSetup` set it false. `ActionDock` under the header. `App` does not mount `EventModal`. `ChoiceModal` only if `choicePickerOpen`; includes **Back** and backdrop click → `closeChoicePicker`. Kid and taunt never open the picker.

- [ ] **Step 1: Store flag tests (fail first)**

Add to `src/store/gameStore.test.ts`:

```ts
it('opens the house picker from HUD and Back leaves the month paused', () => {
  expect(useGameStore.getState().startGame(DEFAULT_SETUP)).toBe(true);
  useGameStore.setState({ cashBuffer: 16_00_000, portfolioValue: 0, investedAmount: 0 });
  useGameStore.getState().openChoice('house');
  expect(useGameStore.getState().phase).toBe('awaitingChoice');
  expect(useGameStore.getState().choicePickerOpen).toBe(true);
  useGameStore.getState().closeChoicePicker();
  expect(useGameStore.getState().choicePickerOpen).toBe(false);
  expect(useGameStore.getState().phase).toBe('awaitingChoice');
  expect(useGameStore.getState().pendingChoice?.kind).toBe('house');
});

it('does not open a picker for payPending', () => {
  expect(useGameStore.getState().startGame(DEFAULT_SETUP)).toBe(true);
  useGameStore.setState({
    phase: 'awaitingEvent',
    pendingEvent: {
      id: 'brewery',
      title: 'Microbrewery',
      copy: 'Weekend',
      cost: 8_000,
    },
    choicePickerOpen: false,
  });
  useGameStore.getState().openChoicePicker();
  expect(useGameStore.getState().choicePickerOpen).toBe(false);
});
```

- [ ] **Step 2: Run store tests to see them fail**

Run: `npx vitest run src/store/gameStore.test.ts`

Expected: FAIL — `choicePickerOpen` missing.

- [ ] **Step 3: Implement store fields**

Extend `GameStore`:

```ts
export type GameStore = GameState & {
  startGame: (setup: SetupConfig) => boolean;
  tick: () => void;
  payPending: () => void;
  resolveChoice: (input: ChoiceInput) => void;
  openChoice: (kind: ChoiceKind) => void;
  openChoicePicker: () => void;
  closeChoicePicker: () => void;
  setSip: (amount: number) => void;
  transferToMarket: (amount: number) => void;
  setPaused: (paused: boolean) => void;
  setTickSpeed: (speed: 1 | 2 | 4) => void;
  resetToSetup: () => void;
  choicePickerOpen: boolean;
};
```

```ts
function pickerKind(kind: ChoiceKind | undefined): boolean {
  return kind === 'house' || kind === 'car' || kind === 'marriage';
}

export const useGameStore = create<GameStore>((set, get) => ({
  ...emptySetupState(),
  choicePickerOpen: false,
  startGame: (setup) => {
    if (validateSetup(setup).length > 0) {
      return false;
    }
    set({ ...startGameFromSetup(setup), choicePickerOpen: false });
    return true;
  },
  tick: () => {
    set({ ...tick(get(), Math.random), choicePickerOpen: false });
  },
  payPending: () => {
    set({ ...payPending(get(), Math.random), choicePickerOpen: false });
  },
  resolveChoice: (input) => {
    set({ ...resolveChoice(get(), input, Math.random), choicePickerOpen: false });
  },
  openChoice: (kind) => {
    const next = openChoiceEngine(get(), kind);
    set({
      ...next,
      choicePickerOpen: next.phase === 'awaitingChoice' && pickerKind(next.pendingChoice?.kind),
    });
  },
  openChoicePicker: () => {
    const s = get();
    if (s.phase !== 'awaitingChoice' || !pickerKind(s.pendingChoice?.kind)) {
      return;
    }
    set({ choicePickerOpen: true });
  },
  closeChoicePicker: () => {
    set({ choicePickerOpen: false });
  },
  resetToSetup: () => {
    set({ ...resetToSetup(get()), choicePickerOpen: false });
  },
  // setSip / transfer / pause / speed unchanged from Task 2
}));
```

`tick` clearing picker is correct: a new month should not leave a stale picker. Auto-offer does not set picker true (only HUD `openChoice` and `openChoicePicker`).

- [ ] **Step 4: Run store tests**

Run: `npx vitest run src/store/gameStore.test.ts`

Expected: PASS.

- [ ] **Step 5: Create `ActionDock`**

Create `src/ui/ActionDock.tsx`:

```tsx
import { formatInr } from '../lib/formatInr';
import { useGameStore } from '../store/gameStore';

export function ActionDock() {
  const phase = useGameStore((s) => s.phase);
  const pendingEvent = useGameStore((s) => s.pendingEvent);
  const pendingBoss = useGameStore((s) => s.pendingBoss);
  const pendingChoice = useGameStore((s) => s.pendingChoice);
  const payPending = useGameStore((s) => s.payPending);
  const resolveChoice = useGameStore((s) => s.resolveChoice);
  const openChoicePicker = useGameStore((s) => s.openChoicePicker);

  if (phase === 'awaitingEvent' && pendingEvent) {
    return (
      <section className="rounded-lg border border-[var(--expense)] bg-[var(--card)] p-4">
        <p className="text-xs uppercase tracking-wide text-[var(--expense)]">Life happens</p>
        <h2 className="mt-2 text-lg font-semibold">{pendingEvent.title}</h2>
        <p className="mt-1 text-[var(--muted)]">{pendingEvent.copy}</p>
        <button
          type="button"
          className="mt-4 min-h-11 w-full rounded bg-[var(--expense)] px-4 py-2 font-medium text-[var(--modal)] sm:w-auto"
          onClick={payPending}
        >
          Pay {formatInr(pendingEvent.cost)}
        </button>
      </section>
    );
  }

  if (phase === 'awaitingBoss' && pendingBoss) {
    const bill = pendingBoss.effect.type === 'oneShotBill' ? pendingBoss.effect.amount : 0;
    return (
      <section className="rounded-lg border border-[var(--expense)] bg-[var(--card)] p-4">
        <p className="text-xs uppercase tracking-wide text-[var(--expense)]">Breaking News</p>
        <h2 className="mt-2 text-lg font-semibold">{pendingBoss.title}</h2>
        <p className="mt-1 text-[var(--muted)]">{pendingBoss.copy}</p>
        <button
          type="button"
          className="mt-4 min-h-11 w-full rounded bg-[var(--expense)] px-4 py-2 font-medium text-[var(--modal)] sm:w-auto"
          onClick={payPending}
        >
          {bill > 0 ? `Pay ${formatInr(bill)}` : 'Continue'}
        </button>
      </section>
    );
  }

  if (phase !== 'awaitingChoice' || !pendingChoice) {
    return null;
  }

  if (pendingChoice.kind === 'taunt') {
    return (
      <section className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
        <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Family WhatsApp</p>
        <h2 className="mt-2 text-lg font-semibold">{pendingChoice.title}</h2>
        <p className="mt-1 whitespace-pre-line text-[var(--muted)]">{pendingChoice.copy}</p>
        <button
          type="button"
          className="mt-4 min-h-11 w-full rounded bg-[var(--money)] px-4 py-2 font-medium text-[var(--modal)] sm:w-auto"
          onClick={() => resolveChoice({ action: 'dismiss' })}
        >
          Continue
        </button>
      </section>
    );
  }

  if (pendingChoice.kind === 'kid') {
    return (
      <section className="rounded-lg border border-[var(--money)] bg-[var(--card)] p-4">
        <p className="text-xs uppercase tracking-wide text-[var(--money)]">Life choice</p>
        <h2 className="mt-2 text-lg font-semibold">{pendingChoice.title}</h2>
        <p className="mt-1 text-[var(--muted)]">{pendingChoice.copy}</p>
        <p className="mt-2 text-sm text-[var(--muted)]">Birth cost · {formatInr(pendingChoice.birthCost)}</p>
        <button
          type="button"
          className="mt-4 min-h-11 w-full rounded bg-[var(--money)] px-4 py-2 font-medium text-[var(--modal)] sm:w-auto"
          onClick={() => resolveChoice({ action: 'accept' })}
        >
          Yes, bacche
        </button>
        <button
          type="button"
          className="mt-3 min-h-11 w-full rounded bg-[var(--btn)] px-4 py-2 font-medium sm:ml-2 sm:w-auto"
          onClick={() => resolveChoice({ action: 'dismiss' })}
        >
          Not yet
        </button>
      </section>
    );
  }

  const declineLabel =
    pendingChoice.kind === 'house' ? 'Keep renting' : 'Not yet';

  return (
    <section className="rounded-lg border border-[var(--money)] bg-[var(--card)] p-4">
      <p className="text-xs uppercase tracking-wide text-[var(--money)]">Life choice</p>
      <h2 className="mt-2 text-lg font-semibold">{pendingChoice.title}</h2>
      <p className="mt-1 text-[var(--muted)]">{pendingChoice.copy}</p>
      <button
        type="button"
        className="mt-4 min-h-11 w-full rounded bg-[var(--money)] px-4 py-2 font-medium text-[var(--modal)] sm:w-auto"
        onClick={openChoicePicker}
      >
        Choose
      </button>
      <button
        type="button"
        className="mt-3 min-h-11 w-full rounded bg-[var(--btn)] px-4 py-2 font-medium sm:ml-2 sm:w-auto"
        onClick={() => resolveChoice({ action: 'dismiss' })}
      >
        {declineLabel}
      </button>
    </section>
  );
}
```

- [ ] **Step 6: Wire Dashboard and App; picker Back**

In `Dashboard.tsx`, import `ActionDock` and render it immediately after `</header>`:

```tsx
      <ActionDock />
```

In `src/App.tsx`:

```tsx
import { ChoiceModal } from './ui/ChoiceModal';
import { Dashboard } from './ui/Dashboard';
import { EndReceipt } from './ui/EndReceipt';
import { GameLoop } from './ui/GameLoop';
import { SetupScreen } from './ui/SetupScreen';
import { useGameStore } from './store/gameStore';

export default function App() {
  const phase = useGameStore((s) => s.phase);
  const choicePickerOpen = useGameStore((s) => s.choicePickerOpen);
  return (
    <div className="min-h-screen bg-[var(--app-bg)] text-[var(--app-fg)]">
      <GameLoop />
      {phase === 'setup' && <SetupScreen />}
      {phase !== 'setup' && phase !== 'ended' && <Dashboard />}
      {choicePickerOpen && <ChoiceModal />}
      {phase === 'ended' && <EndReceipt />}
    </div>
  );
}
```

In `ChoiceModal.tsx`:

- `const closeChoicePicker = useGameStore((s) => s.closeChoicePicker);`
- Delete the entire `kind === 'kid'` and `kind === 'taunt'` blocks (return null if those kinds appear). Keep marriage/house/car bodies.
- On every remaining overlay root, use this chrome. Copy, title, sliders, Buy, and dismiss buttons stay as they are today under the Back button.

```tsx
      <div
        className="fixed inset-0 z-20 flex items-center justify-center bg-[var(--scrim)] md:p-4"
        onClick={closeChoicePicker}
      >
        <div
          className="h-full w-full max-w-md overflow-y-auto border-[var(--border)] bg-[var(--modal)] p-6 md:h-auto md:rounded-lg md:border"
          onClick={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            className="min-h-11 rounded border border-[var(--border)] px-3 text-sm"
            onClick={closeChoicePicker}
          >
            Back
          </button>
```

Delete `src/ui/EventModal.tsx`. Grep the repo for `EventModal` and remove leftover imports.

- [ ] **Step 7: Tests and typecheck**

Run: `npx vitest run && npx tsc -b --pretty false`

Expected: all tests PASS, tsc clean.

Manual (dev server already at Vite): start a run, wait or force an event by playing until pause — dock at top, dashboard scrollable, no full-screen event scrim. Click House with 16L cash — picker opens; Back returns to dock; Keep renting resumes.

- [ ] **Step 8: Commit**

```bash
git add src/ui/ActionDock.tsx src/ui/Dashboard.tsx src/ui/ChoiceModal.tsx src/App.tsx src/store/gameStore.ts src/store/gameStore.test.ts
git rm src/ui/EventModal.tsx
git commit -m "Replace blocking event modals with a top action dock."
```

---

### Task 7: Update `docs/PROJECT.md`

**Files:**
- Modify: `docs/PROJECT.md`
- Modify: `AGENTS.md` only if a hard constraint sentence is now wrong (SIP cap is compatible with “do not liquidate to fund SIP”; no AGENTS change required unless you mention the dock)

**Interfaces:**
- Consumes: this spec
- Produces: PROJECT.md matches live behavior

- [ ] **Step 1: Edit PROJECT.md**

Monthly pipeline bullet 1: after the 30% roll, pick from events that match owned house/car; skip the pause if the filtered pool is empty.

Money rules: add

- Planned SIP is capped at investable cash: leftover FD + salary − living − rent − EMIs between months; leftover cash only when this month’s SIP is still pending. Slider and `plannedSip` snap down. `applySip` still never liquidates.
- HUD inflows list EMI lines next to rent.

Content: society/plumber require a house; car service requires a car. Shaadi/bacche auto-offer and HUD buttons require `WEDDING_MIN` / `BIRTH_COST` payable (cash then STCG), same helper as down payment.

UI/theme: `playing` / `awaiting*` show the dashboard. Pending event/boss/choice render in `ActionDock` at the top. House/car/shaadi pickers are `ChoiceModal` only after Choose. Do not block the dashboard with `EventModal`.

File map: replace `EventModal.tsx` with `ActionDock.tsx`; note `sipCap` / `clampPlannedSip` in `economy.ts` and `canPayFromBalance` in `loans.ts`.

- [ ] **Step 2: Commit**

```bash
git add docs/PROJECT.md
git commit -m "Document SIP cap, gated events, and the action dock."
```

---

## Self-review (plan vs spec)

| Spec section | Task |
|---|---|
| SIP plan + debit, never sell for SIP | 2 |
| Cash never negative / bills liquidate | existing paycheck tests; unchanged |
| EMI HUD | 5 |
| Event eligibility + 30% roll | 3 |
| Offer minimum gate + July reminders | 4 |
| ActionDock, no event scrim | 6 |
| Picker after Choose / HUD; Back | 6 |
| `canPayFromBalance` | 1 |
| `choicePickerOpen` | 6 |
| `docs/PROJECT.md` | 7 |
| Cancel-subscriptions | explicitly out of scope |

No TBD/TODO in tasks. Signatures: `pickLifeEvent(state, rng)` is used in Task 3 `beginMonth` the same way. `sipCap` / `clampPlannedSip` names match Tasks 2, 5, and 6.
