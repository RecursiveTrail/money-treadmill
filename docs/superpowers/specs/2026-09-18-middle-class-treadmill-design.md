# The Middle-Class Treadmill (Indian Tax Edition) — Design Spec

Date: 2026-09-18  
Status: Approved for implementation planning  
Product: Single-player satirical idle/RNG web game for Recursive Trail  
PRD source: `docs/prd.md`

## 1. Goal

A replayable browser game: a 25-year-old Indian salaried employee tries to hit a FIRE corpus. The player sets the plan, watches months tick, survives life events and budget-season bosses, and is judged on **after-tax, inflation-adjusted rupees** at the target retirement age.

v1 is a real mini-game (setup, live SIP, win or lose, replay), not a scripted punchline. The satire is in the events, bosses, and receipt — not in making victory impossible.

## 2. Non-goals (v1)

- Backend, accounts, leaderboards
- Save / resume
- Sound, music, particles beyond a short modal shake
- Tax accuracy beyond the named rules below (no old-vs-new regime calculator, no indexation math)
- Mobile-first layout (desktop 1280px is the target; it should not be broken on a laptop)
- Web Worker simulation

## 3. Stack

- Vite + React + TypeScript strict
- Tailwind CSS
- `lucide-react`
- Zustand for live game state
- Vitest for engine unit tests
- Indian rupee formatting in the UI (`₹1,00,000`)

Zustand does **not** contain the money rules. The store calls a pure engine.

## 4. Architecture

Three layers:

```
src/engine/     pure TypeScript — GameState transitions, no React
src/store/      Zustand — holds GameState, thin actions, pause/speed
src/ui/         screens + GameLoop interval
```

### 4.1 Engine (`src/engine/`)

| File | Responsibility |
|---|---|
| `types.ts` | `GameState`, setup input, ledger entry, event, boss, ending |
| `defaults.ts` | Default setup numbers and economic constants |
| `events.ts` | Life-event pool |
| `bosses.ts` | Annual boss table + year-4+ rotation |
| `economy.ts` | Liquidation with STCG, SIP, paycheck, compounding |
| `tick.ts` | Phased month pipeline (`beginMonth`, `continueMonth`, `applyBossAndFinish`) |
| `ending.ts` | LTCG, inflation discount, win/lose |
| `random.ts` | Injected RNG (`() => number` in `[0, 1)`) so tests are deterministic |

Every engine function is `(state, input) => nextState` or a pure helper. Calendar display is derived from age (fixed origin **July 2026**) — no `Date.now`.

### 4.2 Store (`src/store/gameStore.ts`)

Holds the single `GameState`. Actions:

- `startGame(setup)`
- `tick(rng)`
- `payPending()` — resolve event or boss, then continue the unfinished month
- `setSip(amount)`
- `setPaused(boolean)`
- `setTickSpeed(1 \| 2 \| 4)`
- `resetToSetup()` — keep last setup values, phase → `setup`

The store must not start or own `setInterval`.

### 4.3 UI (`src/ui/`)

- `GameLoop` — `setInterval` from `tickSpeed`; skips ticks when `isPaused` or phase is not `playing`; uses a ref to call the latest `tick`. Clears interval on unmount.
- `SetupScreen`, `Dashboard`, `EventModal`, `LedgerFeed`, `EndReceipt`, `BufferGauge`

Theme: `slate-900` background, `emerald-400` money, `rose-500` expenses, monospace ledger.

## 5. Game state

```ts
type Phase = 'setup' | 'playing' | 'awaitingEvent' | 'awaitingBoss' | 'ended';

type SetupConfig = {
  startAgeYears: number;
  targetRetirementAge: number;
  monthlySalary: number;
  fixedExpenses: number;
  plannedSip: number;
  targetCorpusToday: number;
};

type LedgerKind = 'salary' | 'expense' | 'sip' | 'event' | 'liquidation' | 'boss' | 'interest' | 'system';

type LedgerEntry = {
  id: string;
  ageLabel: string;      // "25y 3m"
  monthLabel: string;    // "Oct 2026"
  kind: LedgerKind;
  text: string;
  amount: number;        // signed rupees; 0 for flavour-only
};

type PendingEvent = { id: string; title: string; copy: string; cost: number };

type BossEffect =
  | { type: 'salaryMul'; factor: number }
  | { type: 'expenseAdd'; amount: number }
  | { type: 'expenseMul'; factor: number }
  | { type: 'setLtcg'; rate: number }
  | { type: 'oneShotBill'; amount: number }
  | { type: 'flavour' };

type PendingBoss = { id: string; title: string; copy: string; effect: BossEffect };

type Ending = {
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

type GameState = {
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

function calendarMonth(ageMonths: number): number {
  return [7, 8, 9, 10, 11, 12, 1, 2, 3, 4, 5, 6][ageMonths];
}

function calendarYear(originYear: number, yearsPlayed: number, ageMonths: number): number {
  return originYear + yearsPlayed + (ageMonths >= 6 ? 1 : 0);
}
```

Origin year is 2026. July–December use `2026 + yearsPlayed`; January–June add one more (Dec 2026 → Jan 2027 without bumping `yearsPlayed`).

`cashLeft` is shown on the receipt and **does not** count toward the win check. FIRE is the portfolio.

## 6. Defaults and constants

| Key | Value |
|---|---|
| Start age | 25 |
| Retire age | 45 |
| Salary | ₹1,00,000 |
| Expenses | ₹55,000 |
| SIP | ₹30,000 |
| Target (today’s ₹) | ₹40,00,000 |
| Starting cash | ₹50,000 |
| Starting portfolio | ₹0 |
| Starting LTCG | 10% |
| 1x tick | 2000 ms / month |
| 2x / 4x | 1000 ms / 500 ms |
| Life-event chance | 0.30 |
| Monthly portfolio return | 1% (12% nominal annual) |
| End-game inflation | 7% annual |
| STCG on forced liquidation | 20% of the deficit |
| Display start | July 2026 |

These defaults are a **narrow win** on a clean 20-year ₹30k SIP (~₹42L real). Events, panic sells, and expense spikes should make many runs lose. That is intentional.

### 6.1 Setup validation

Reject and show inline errors when:

- `targetRetirementAge <= startAgeYears`
- `fixedExpenses >= monthlySalary`
- any money field `< 0`
- non-finite numbers

SIP may exceed `(salary - expenses)`; that only means cash will shrink.

## 7. Monthly pipeline

A month is **phased** so a modal can pause mid-month without double-counting. The age on the state **is** the month being simulated. Age increments **after** SIP/boss, not before.

`startGame` sets `ageYears = startAgeYears`, `ageMonths = 0`, `yearsPlayed = 0`, `phase = 'playing'` (July of the opening year). Opening July has **no** annual boss.

`GameLoop` may call `tick` only when `phase === 'playing'` and `!isPaused`.

### Stage A — paycheck + event roll (`beginMonth`)

1. `needsAnnualBoss = (ageMonths === 0 && yearsPlayed > 0)`.
2. `cashBuffer += monthlySalary - fixedExpenses`.
3. Ledger: salary credit, expense debit.
4. If `cashBuffer < 0`, liquidate `deficit = -cashBuffer`, then `cashBuffer = 0`. If liquidation cannot cover, **bankrupt** (skip remaining stages).
5. Roll life event: if `rng() < 0.30`, pick uniform from the event pool, set `pendingEvent`, `phase = 'awaitingEvent'`, stop.

If no event, continue immediately to stage B.

### Stage B — event payment + SIP + compound (`continueMonth`)

Called from `tick` when there was no event, or from `payPending` after an event.

1. If `pendingEvent`: pay `cost` from cash. If `cost > cashBuffer`, liquidate `cost - cashBuffer` then cash = 0. Clear `pendingEvent`. Bankrupt if liquidation fails.
2. SIP: `sip = min(plannedSip, max(cashBuffer, 0))`. Never liquidate to fund SIP. Subtract from cash; add to `investedAmount` and `portfolioValue`. Ledger `SIP ₹X`, `SIP partial ₹X`, or `SIP skipped`.
3. `portfolioValue = Math.round(portfolioValue * 1.01)`.
4. Go to stage C if `needsAnnualBoss`, else stage D.

Live SIP changes write `plannedSip` immediately and are read here, including for a month paused on an event.

### Stage C — annual boss

Build the boss for current `yearsPlayed` (§9). Set `pendingBoss`, `phase = 'awaitingBoss'`, stop.

On **Continue** / **Pay**:
- Apply `effect` (salary/expense/LTCG/flavour).
- If `oneShotBill`, run the same cash-then-liquidate path as a life event (can bankrupt).
- Ledger the boss, clear `pendingBoss`, `needsAnnualBoss = false`, go to stage D.

A July can therefore show a life-event modal **then** a boss modal. That is intended.

### Stage D — age bump + retirement check

If already `ended`, stop.

Increment `ageMonths`. If `ageMonths === 12`: `ageMonths = 0`, `ageYears += 1`, `yearsPlayed += 1`.

If `ageYears === targetRetirementAge && ageMonths === 0`: compute `ending`, `phase = 'ended'`, `isPaused = true`. Do **not** simulate that retirement July (no extra paycheck at the target age).

Else `phase = 'playing'`.

At defaults this is **240** paychecks (25y 0m through 44y 11m). The 240th increment lands on 45y 0m, `yearsPlayed = 20`, then the receipt. Inflation uses that `yearsPlayed`.

### Liquidation (shared)

```
deficit = amount still owed in rupees
taxHaircut = Math.round(deficit * 0.20)
totalSell = deficit + taxHaircut
if portfolioValue < totalSell → bankrupt (portfolio = 0, cash = 0)
else portfolioValue -= totalSell
ledger: "Liquidated portfolio: −₹[totalSell] (includes 20% STCG)"
```

Cost basis (`investedAmount`) is **not** reduced (v1 simplification: slightly punitive, easier to explain). If `investedAmount > portfolioValue` after sells, clamp `investedAmount = portfolioValue` so LTCG tax cannot go negative.

### Bankrupt

`ending.result = 'bankrupt'`. Receipt still shows whatever portfolio/cash remain (usually 0). This is a lose. It cannot fire at `startGame` just because portfolio is 0.

## 8. End-game math

```
gross = portfolioValue
gains = max(gross - investedAmount, 0)
tax = gains * ltcgRate
afterTax = gross - tax
real = afterTax / (1.07 ** yearsPlayed)
```

- **Win:** `result !== 'bankrupt'` and `real >= targetCorpusToday`
- **Lose:** reached retirement age and `real < targetCorpusToday`
- **Bankrupt:** mid-run wipeout (also a lose screen, different headline)

Receipt lines, in order: Gross portfolio → LTCG @ current rate → After tax → Inflation (7% × years) → Real purchasing power vs target. Cash remaining is a footnote, not in the comparison.

## 9. Content

### 9.1 Life events

30% chance per month, at most one, repeats allowed, uniform pick.

| id | Title | Copy | Cost |
|---|---|---|---|
| wedding | Destination wedding | Friend's destination wedding. You can't say no. | 25000 |
| root-canal | Root canal | Root canal. Insurance denied the claim. | 15000 |
| brewery | Microbrewery | Weekend at a microbrewery went out of hand. | 8000 |
| car-sensor | Car service | Car service and random sensor failure. | 18000 |
| parents | Parents' tests | Parents' full-body checkup. You are the wallet. | 22000 |
| diwali | Diwali haul | Diwali shopping. "Just this year." | 12000 |
| iphone | Upgrade | iPhone because the EMI is "only ₹4,000". You pay lump-sum anyway. | 20000 |
| society | Maintenance | Society maintenance arrears + sinking fund. | 9000 |
| offsite | Optional offsite | Office offsite. Optional, according to the email. | 14000 |
| cousin | Shagun | Cousin's engagement. Envelope physics. | 11000 |
| plumber | Tank + plumber | Water tank cleaning plus a plumber who found "one more issue". | 7000 |
| flight | Emergency flight | Last-minute flight home. Dynamic pricing sends regards. | 16000 |
| ca-fee | CA and advance tax | CA fee plus an advance-tax surprise. | 10000 |
| mba-fomo | Weekend MBA | Online MBA ad. You enroll at 1 a.m. | 25000 |
| swiggy | Subscriptions | Swiggy + Hotstar + "I'll cancel later" finally catch up. | 6000 |

### 9.2 Annual bosses

Triggered on every simulated July except the opening month. Key is `yearsPlayed` **while that July is being played** (June just ended, age already wrapped). First July after 12 months is year 1 (`yearsPlayed === 1`, age 26 at defaults).

| yearsPlayed | id | Effect |
|---|---|---|
| 1 | hike-8 | `monthlySalary *= 1.08` — "Appraisal season. CTC hiked 8%. Stretch assignment attached." |
| 2 | ltcg-hike | `ltcgRate = 0.125` — "LTCG hiked to 12.5%. Indexation removed." |
| 3 | rent-spike | `fixedExpenses += 2000` — "Inflation spikes. Rent and the cook both want more." |
| 4+ | rotation | `(yearsPlayed - 4) % 6` into the pool below |

**Rotation pool (year 4+):**

| index | id | Effect |
|---|---|---|
| 0 | hike-6 | `monthlySalary *= 1.06` |
| 1 | cpi-5 | `fixedExpenses *= 1.05` |
| 2 | diwali-boss | one-shot ₹15,000 bill via the same pay/liquidate path as a life event |
| 3 | tax-news | flavour only (ledger, no money) — "Panel to 'study' capital gains. Markets shrug. You do not." |
| 4 | fuel-rent | `fixedExpenses += 1500` |
| 5 | promo | `monthlySalary *= 1.10` |

Boss copy is Breaking News tone. Modal button: **Continue** (or **Pay** for the Diwali one-shot).

## 10. UI

### Setup

Single form, defaults pre-filled, **Start treadmill**. Errors inline. No extra “quick start” screen.

### Dashboard (Classic HUD)

- **Top bar:** `{Mon YYYY} · Age {y}y {m}m` · animated emerald `portfolioValue` · Pause/Resume · speed `1x / 2x / 4x`
- **Left:** salary (emerald), expenses (rose), SIP slider bound to `plannedSip` (0 to salary, step ₹1,000)
- **Right:** cash buffer as a filling tank; numeric ₹ amount
- **Bottom:** `LedgerFeed`, newest first, terminal styling, ~50 entries retained in state (older dropped)

Event modal: `absolute` overlay, rose header, short CSS shake, **Pay ₹X**. Blocks ticks via `phase`.

End screen replaces the dashboard (or full overlay): brutal receipt + **Play again** (`resetToSetup`).

## 11. Data flow

```
Setup submit → startGame → phase playing
GameLoop interval → tick(rng)
  → engine.beginMonth
  → maybe phase awaitingEvent (stop)
  → else continueMonth → maybe awaitingBoss (stop)
  → else maybe ended
Pay / Continue → payPending → continueMonth / applyBoss → maybe ended
SIP slider → setSip
Pause / speed → store flags (loop reads them)
```

## 12. Error handling

- Invalid setup: stay on form, no store start
- `payPending` with no pending modal: no-op
- `tick` while not `playing`: no-op
- Interval always cleared on unmount and when `phase === 'ended'`
- All money math in integer rupees (round to nearest rupee after multiply)

## 13. Testing (Vitest, engine only)

Required cases:

1. Paycheck **adds** to existing cash (carryover).
2. Negative cash after expenses triggers STCG liquidation of `deficit * 1.20`.
3. Event cost 40k with cash 10k and portfolio 1,00,000 → cash 0, portfolio reduced by 36,000 (30k + 6k tax).
4. SIP 30k with cash 12k → sip 12k, no liquidation.
5. SIP with cash 0 → skipped, portfolio unchanged before compound.
6. Forced sell that exceeds portfolio → `bankrupt`.
7. Year-2 boss sets `ltcgRate` to 0.125.
8. Ending: known portfolio, basis, 20 years → `real` matches `afterTax / (1.07 ** 20)`; win iff `real >= target`.
9. Injected RNG `< 0.30` always schedules an event; `>= 0.30` never does.
10. Calling tick while not `playing` is a no-op.
11. After 12 `beginMonth`+complete cycles from defaults, `yearsPlayed === 1` and `ageMonths === 0` (July, age 26). After 240 complete months, phase is `ended` and `yearsPlayed === 20`.

No React Testing Library requirement in v1. Manual smoke: start defaults, pause, speed, pay one event, run at 4x toward the receipt.

## 14. File tree (v1)

```
index.html
package.json
vite.config.ts
tsconfig.json
tailwind.config.js
src/main.tsx
src/App.tsx
src/index.css
src/engine/*.ts
src/store/gameStore.ts
src/ui/*.tsx
src/lib/formatInr.ts
src/engine/*.test.ts
```

## 15. Constraints for implementers

- TypeScript strict; no `any`
- Functional interval updates / refs — no stale `tick` closures
- Do not put tick math in React components
- Do not auto-invest leftover cash (planned SIP only)
- Do not reset cash each month
- Do not liquidate to fund SIP
- Dark theme as specified; no extra design system
