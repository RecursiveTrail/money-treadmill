# Optional Life Commitments — Design Spec

Date: 2026-09-19
Status: Ready for implementation planning
Product: The Middle-Class Treadmill (Indian Tax Edition)
Amends: `docs/superpowers/specs/2026-09-18-middle-class-treadmill-design.md`
Source: `docs/raw-requirements/requirement-1.md`

Where this file and the 2026-09-18 spec disagree, **this file wins**. Unmentioned v1 rules (tick spine, STCG liquidation, SIP never sells funds, integer rupees, no React in the engine, opening July has no boss, retirement July is not played) still apply.

## 1. Goal

Optional middle-class commitments — house, car, marriage, one child — plus a balance-sheet HUD. Relatives taunt you for skipping them. Winning is judged on inflation-adjusted **net worth**, not portfolio alone.

Skip every commitment and the old path still exists. Take them and the month gets tighter. Satire is in the EMI, the sad-wedding copy, and the WhatsApp taunts — not in forcing a life script.

## 2. Product rules (locked)

| Rule | Decision |
|---|---|
| House, car, marriage, kid | Optional. Decline is always valid. |
| Taunts | Flavour only. ₹0. Do not replace the 30% life-event roll. |
| Win check | Real net worth: after-tax portfolio + cash + home equity. |
| Rent vs EMI | Buying a house sets rent to 0. Home EMI replaces rent. |
| House price | Appreciates ~5% a year. |
| House / car unlock | When the cheapest tier's 20% down payment is payable (cash first, then STCG-sell). |
| Marriage unlock | First month `ageYears >= 30`. |
| Kid unlock | The month after `married === true`. One child max. |
| Down payment | Cash first. Shortfall liquidates portfolio at 20% STCG. |
| Kids | One kid: birth bill + monthly bump, then school bump 36 months later. |
| Car | Loan like the house. **Not** in net worth. |
| Default FIRE target | ₹75,00,000 in today's rupees (setup still editable). |
| Phone | Playable, not dense. Details may hide behind a fold. |

## 3. Non-goals

- Selling or upgrading the house or car
- Prepaying loans, extra-EMI, or rate changes
- Second child, education sim, school picker
- Home-sale tax, stamp duty, registration (down payment is the only purchase cash-out)
- Moving money from portfolio back to FD without the existing STCG liquidation path
- Forcing a 12× emergency fund
- Separate mobile app / PWA
- Save/load, accounts, backend (still v1)

## 4. Architecture

Same three layers. Money still lives in `src/engine/`. Zustand stays a thin wrapper. `GameLoop` still owns `setInterval` and still only ticks when `phase === 'playing'` and `!isPaused`.

```
src/engine/loans.ts      EMI, amortize, canAffordDownPayment
src/engine/choices.ts    catalogs, unlock, apply/dismiss, taunt copy
src/engine/returns.ts    noisy equity, FD, house 5% tick
src/engine/netWorth.ts   HUD and ending helpers
```

New phase: `awaitingChoice`. Treat it like `awaitingEvent`: the interval must not fire.

New store actions (thin):

- `resolveChoice(input)` — accept (with wedding spend / selected tier) or dismiss
- `transferToMarket(amount)` — FD → portfolio, one way
- `openChoice(kind)` — HUD; no-op unless that kind is eligible and not already owned

`payPending` still only resolves events and bosses.

### 4.1 Isolation

| Unit | Does | Input | Depends on |
|---|---|---|---|
| `loans.ts` | EMI formula, one-month amortize, affordability | rupees, rate, tenure, cash, portfolio | `liquidate` for STCG math only |
| `choices.ts` | Which offer is due, catalogs, apply purchase | `GameState` | `loans.ts`, `payBill` / `liquidate` |
| `returns.ts` | Monthly mark-to-market | state + rng | none |
| `netWorth.ts` | Pre-tax HUD pile; after-tax ending pile | state | `ending.ts` tax lines |
| `tick.ts` | Order of stages | state + rng | all of the above |

## 5. State

Keep existing `GameState` fields. Add:

```ts
type Phase =
  | 'setup' | 'playing' | 'awaitingEvent' | 'awaitingBoss'
  | 'awaitingChoice' | 'ended';

type LoanKind = 'home' | 'car';

type Loan = {
  kind: LoanKind;
  originalPrincipal: number;
  principalRemaining: number;
  annualRate: number;     // home 0.08, car 0.10
  emi: number;            // integer rupees, fixed at origination
  monthsTotal: number;    // home 240, car 60
  monthsRemaining: number;
};

type House = {
  tierId: 'bhk2' | 'bhk3' | 'premium';
  purchasePrice: number;
  currentValue: number;
};

type ChoiceKind = 'house' | 'car' | 'marriage' | 'kid' | 'taunt';

type PendingChoice = {
  kind: ChoiceKind;
  title: string;
  copy: string;
  // house/car: selectable tiers already filtered to those whose down payment is payable
  // marriage: slider bounds + recommended
  // kid / taunt: no extra payload
};

// GameState additions
livingExpenses: number;          // was the non-rent part of fixedExpenses
rent: number;                    // 0 after home purchase
loans: Loan[];                   // 0–2
house: House | null;
married: boolean;
hasChild: boolean;
childMonths: number | null;      // months since birth; null if no child
schoolStarted: boolean;
pendingChoice: PendingChoice | null;
offered: {                       // first auto-pause already shown
  house: boolean;
  car: boolean;
  marriage: boolean;
  kid: boolean;
};
```

`fixedExpenses` is **removed** from live state. Setup still has one `fixedExpenses` field so the form does not grow. At `startGame`:

```
rent = min(25_000, setup.fixedExpenses)
livingExpenses = setup.fixedExpenses - rent
```

Boss `expenseAdd` always adds to `livingExpenses`. Boss `expenseMul` multiplies `livingExpenses` and, if `rent > 0`, `rent`. EMIs never scale. Year-3 `rent-spike` (+₹2,000): if `rent > 0` add to `rent`, else add to `livingExpenses`.

`LedgerKind` adds `'choice' | 'transfer' | 'taunt' | 'emi'`. Monthly FD, house mark, and equity noise are **not** ledgered (too noisy at 4x).

## 6. Monthly pipeline

Age is still the month being simulated. Age increments after SIP/boss. Do not reorder the v1 spine; insert choice + returns.

1. **beginMonth** — `needsAnnualBoss = ageMonths === 0 && yearsPlayed > 0`. Paycheck (below). If `rng() < 0.30`, `awaitingEvent`, stop.
2. **continueMonth** — pay event if any (existing `payBill`). Then **maybeChoice**: if a choice should auto-pause, set `pendingChoice`, `phase = awaitingChoice`, stop. Else SIP, returns, maybe boss, finish.
3. **resolveChoice** — dismiss or apply. Clear `pendingChoice`. If bankrupt, stop. Then SIP → returns → maybe boss → finish (same tail as continueMonth).
4. **applyBossAndFinish** — unchanged, then `finishMonth`.
5. **finishMonth** — age bump; end if retirement July; else `playing`.

At most **one** auto-choice pause per month. Priority if several are due: **marriage > kid > house > car > taunt**. If a real offer is due, the taunt waits for a later month.

`tick` while `phase !== 'playing'` is still a no-op. `GameLoop` already keys off `phase === 'playing'`.

### 6.1 Paycheck

```
outflow = livingExpenses + rent + sum(loans.emi)
cashBuffer += monthlySalary - outflow
if cashBuffer < 0: liquidate deficit (existing STCG 20%); cash = 0
if bankrupt: forfeit house, clear loans, cash = 0, portfolio = 0; do not amortize
else: for each loan, amortize one month
```

Ledger: salary, living, rent if `rent > 0`, one `emi` line per active loan. Skip EMI ledger lines on bankrupt.

Amortize (reducing balance, interest front-loaded):

```
interest = round(principalRemaining * annualRate / 12)
principalPaid = min(max(emi - interest, 0), principalRemaining)
principalRemaining -= principalPaid
monthsRemaining -= 1
if principalRemaining === 0: drop the loan (EMI stops next month)
```

EMI is fixed at origination from §7. Do not recompute EMI each month.

### 6.2 Returns (after SIP)

All integer rupees after multiply. Injected `rng` for equity only.

- **Portfolio:** `portfolioValue = round(portfolioValue * equityFactor(rng))`
  `equityFactor = 1 + 0.01 + 0.04 * (rng() - 0.5)`
  Range **0.99–1.03**, mean **1.01** (~12.7% if flat). Noise is visible; the long run still sits around 12–13%. `investedAmount` (cost basis) does not change here.
- **FD:** `cashBuffer = round(cashBuffer * (1.05 ** (1/12)))`
- **House:** if owned, `currentValue = round(currentValue * (1.05 ** (1/12)))`

SIP is unchanged: `min(plannedSip, max(cash, 0))`, never liquidate to fund SIP.

### 6.3 Transfer FD → market

Player action, any playing/paused-but-not-ended phase except `setup` / `ended`. Clamp `amount` to `[0, cashBuffer]`. Subtract from cash; add to `portfolioValue` and `investedAmount`. Ledger `transfer`. No STCG (it is a buy, not a sell). No reverse transfer.

## 7. Loans and catalogs

```
emi(P, annualRate, years) =
  round(P * r * (1+r)^n / ((1+r)^n - 1))
  where r = annualRate / 12, n = years * 12
```

Down payment = `round(price * 0.20)`. Loan principal = `price - down`.

**Payable** iff `cash >= down` OR `portfolioValue >= round((down - cash) * 1.20)` (the STCG haircut on the shortfall). Paying uses existing `payBill` / `liquidate` on the down payment (cash first, then sell).

### 7.1 House — one, ever

20% down, **8%**, **20 years**. Buying sets `rent = 0` and `house`. Cannot sell. Equity = `max(currentValue - home principalRemaining, 0)`.

| tierId | Label | Price | Down | EMI |
|---|---|---|---|---|
| bhk2 | 2 BHK | ₹80,00,000 | ₹16,00,000 | ₹53,532 |
| bhk3 | 3 BHK | ₹1,10,00,000 | ₹22,00,000 | ₹73,607 |
| premium | Premium 3 BHK | ₹1,60,00,000 | ₹32,00,000 | ₹1,07,064 |

The picker lists every tier whose down payment is **payable this month**. If only 2 BHK is payable, the others are visible but disabled with “need ₹X more (incl. STCG)”.

First auto-pause: the first month the **2 BHK** down payment is payable and `house === null`. After dismiss: HUD button whenever any tier is payable; **July reminder** (`ageMonths === 0 && yearsPlayed > 0`) if still no house and 2 BHK is payable.

### 7.2 Car — one, ever

20% down, **10%**, **5 years**. EMI is extra (does not replace rent). Current value is **not** tracked. Not in HUD net worth. Not in the win check.

| tierId | Label | Price | Down | EMI |
|---|---|---|---|---|
| used | Used | ₹5,00,000 | ₹1,00,000 | ₹8,499 |
| new | New | ₹10,00,000 | ₹2,00,000 | ₹16,998 |
| suv | SUV | ₹20,00,000 | ₹4,00,000 | ₹33,995 |

Unlock on **used** payable. Same first-pause / HUD / July pattern as house. Independent of marriage and house.

### 7.3 Marriage — from age 30

Unlock when `ageYears >= 30 && !married`. Spend slider **₹2,00,000–₹25,00,000**, step **₹50,000**, default and recommended **₹8,00,000**. Pay with cash-then-STCG. Sets `married = true`. Not an asset.

Copy after pay (ledger + modal confirmation line):

- Spend `< ₹5,00,000`: sad-spouse roast (laminated menu, condolence GIF, “budget blessing”).
- Spend `₹5,00,000–₹10,00,000`: polite disappointment (“respectable; the aunties will still talk”).
- Spend `> ₹10,00,000`: izzat, empty FD joke.

Dismiss keeps `married === false`. July reminder while `ageYears >= 30 && !married`.

### 7.4 Kid — after marriage, one

Unlock the **next** month after the wedding month (`married && !hasChild`). Not the same month as the wedding.

- **Yes:** pay birth bill **₹1,50,000** (cash-then-STCG); `hasChild = true`; `childMonths = 0`; `livingExpenses += 12_000`.
- Every `finishMonth` while `hasChild`: `childMonths += 1`. When `childMonths` becomes **36** (~three years, 36 month-ends including the birth month) and `!schoolStarted`: `livingExpenses += 10_000`; `schoolStarted = true`; ledger “School fees begin”. No modal.
- **No:** dismiss; July reminder while married and childless.

No second child. No education picker.

### 7.5 Taunts — ₹0

If any of {no house, unmarried and `ageYears >= 27`, married but no kid, no car} and it is **January or July** (`ageMonths === 0 || ageMonths === 6`) and not the opening July (`yearsPlayed > 0 || ageMonths === 6`): queue a taunt **only when no higher-priority offer is due**.

One modal, 1–3 lines, button **Continue**. Examples:

- no house: “Ghar kab le rahe ho? Rent receipt is not an heirloom.”
- unmarried (from 27, two years before the offer): “Shaadi kab kar rahe ho? Relatives have formed a committee.”
- no kid after marriage: “Bacche kab? Your mother forwarded a baby reel.”
- no car: “Car kab? Cab receipts do not impress the colony.”

No rupees. Does not set any flag except consuming this slot. Next eligible Jan/July can taunt again.

## 8. HUD

**Desktop (≥768px):**

- Top: `{Mon YYYY} · Age` · **net worth** (animated) · smaller portfolio line · pause / 1x 2x 4x / theme
- Left: salary, living, rent (or “rent: owned”), SIP slider
- Right: three buckets — **Investments** (portfolio), **EMIs** (per loan: EMI, principal left, months left; empty state “no EMIs”), **FD / cash** (amount, ~5%, transfer control, 12× marker)
- Bottom: ledger

**12× marker:** `emergencyTarget = 12 * (livingExpenses + rent + sum(emi))`. Fill vs cash. Amber when cash `<` target. **Never blocks** SIP, transfer, or purchase.

**HUD net worth** (pre-LTCG, live):

```
portfolioValue + cashBuffer + max(house.currentValue - homePrincipal, 0)
```

**Phone (<768px), playable bar:**

Always on first screen: month, age, net worth, pause, speed, SIP slider, cash, and any blocking modal (Pay / Dismiss / Continue full-width, large tap target).

Behind a **Details** fold: EMI table, FD→market transfer, 12× gauge, ledger.

Setup: single column, full-width **Start treadmill**. Existing validation. Target default ₹75L.

Choice modal: full-viewport sheet on small screens. House/car: three rows (price, down, EMI) + Dismiss. Marriage: slider + recommended chip + Dismiss. Kid: Yes / Not yet. Taunt: Continue only.

Life buttons (House / Car / Shaadi / Bacche) show when that kind is eligible and not owned; they call `openChoice`. Hide when owned or locked.

## 9. Ending

```
grossPortfolio = portfolioValue
gains = max(gross - investedAmount, 0)
tax = round(gains * ltcgRate)
afterTaxPortfolio = round(gross - tax)
homeEquity = house ? max(house.currentValue - homePrincipal, 0) : 0
netWorth = afterTaxPortfolio + cashBuffer + homeEquity
real = round(netWorth / (1.07 ** yearsPlayed))
```

- **Win:** not bankrupt and `real >= targetCorpusToday` (default ₹75L)
- **Lose:** hit retirement age and `real < target`
- **Bankrupt:** mid-run wipeout. Forfeit house and loans. Receipt net worth 0. Still a lose headline.

Receipt order: Gross portfolio → LTCG → After-tax portfolio → Cash (FD) → Home equity (or “rented”) → Net worth → Inflation → Real vs target. Footnote if a car loan or car was taken: “car does not count.” Wedding/kid spend do not appear as assets.

`Ending` type adds `cashLeft` (already there), `homeEquity`, `netWorth`, `realPurchasingPower` (now from net worth).

₹75L is the default because ₹40L makes a surviving 2 BHK an almost-automatic win, and ₹1.2 Cr makes skipping the house a near-certain loss.

## 10. Data flow

```
Setup → startGame (split rent/living, target default 75L) → playing
GameLoop → tick(rng)
  beginMonth → paycheck (incl. EMIs) → maybe awaitingEvent
  continueMonth → pay event → maybe awaitingChoice → SIP → returns → maybe awaitingBoss → finishMonth
Pay event/boss → payPending
Choice HUD or auto-pause → resolveChoice(accept|dismiss) → SIP/returns/boss/finish
FD shift → transferToMarket
SIP slider → setSip (unchanged)
```

## 11. Error handling

- Invalid setup: stay on form (existing).
- `tick` if not `playing`: no-op.
- `payPending` with no event/boss: no-op.
- `openChoice` unless `phase === 'playing'` and that kind is eligible and not owned: no-op (do not steal an event/boss/choice modal).
- `resolveChoice` with no `pendingChoice`: no-op.
- Accept house/car/wedding/kid that is not payable: stay on modal, no partial state.
- `transferToMarket`: clamp to cash; 0 is a no-op.
- Interval: still no ticks on `awaitingChoice`; clear on unmount and `ended`.
- Integer rupees after every multiply, including `1.05**(1/12)` and equity noise.

## 12. Testing (Vitest, engine)

Keep all v1 cases. `fixedExpenses` assertions become `living + rent`. Add:

1. Default split: expenses ₹55,000 → rent ₹25,000, living ₹30,000.
2. Home EMI identity: origination EMI matches the table; after 240 amortize steps `principalRemaining === 0`.
3. Buy 2 BHK with cash ≥ ₹16L: cash drops by ₹16L, rent 0, one home loan, house.currentValue ₹80L.
4. Buy with cash ₹6L and enough portfolio: STCG sell of `round(10L * 1.20)` then house exists.
5. Cannot afford 2 BHK down (cash + portfolio after haircut): no unlock, `openChoice('house')` no-op.
6. Dismiss house: ₹0 movement, `house === null`, rent unchanged, later `openChoice` still works when payable.
7. Car equity excluded: owned used car, ending `homeEquity` 0 if no house, net worth has no car price.
8. Kid: birth +₹12k living; at `childMonths === 36`, +₹10k more once.
9. Marriage spend ₹3L sets married and sad copy; decline does not.
10. `equityFactor` at rng 0 → 0.99, rng 0.5 → 1.01, rng 1 would be 1.03 but rng is `[0,1)` so 0.999 → ~1.03.
11. FD: cash 1,00,000 after one returns step equals `round(100000 * (1.05**(1/12)))`.
12. Ending: known portfolio, basis, cash, house value, principal, 20 years → `real` matches formula; win iff `real >= 75L` (or the setup target).
13. `tick` in `awaitingChoice` is a no-op.
14. Transfer ₹X: cash −X, portfolio +X, investedAmount +X.
15. Bankrupt forfeits house and loans.
16. Taunt month does not debit cash.
17. After 240 complete months from defaults, phase `ended`, `yearsPlayed === 20` (v1 still holds with new paycheck).

No React Testing Library requirement. Manual smoke: phone-width start, pay one event, open/dismiss house, shift FD, 4x toward a receipt.

## 13. File map (new or touched)

| Path | Role |
|---|---|
| `src/engine/types.ts` | Phase, Loan, House, PendingChoice, GameState, Ending |
| `src/engine/defaults.ts` | `DEFAULT_RENT = 25_000`, target ₹75L, return constants |
| `src/engine/loans.ts` | `emi`, `amortize`, `canAffordDownPayment` |
| `src/engine/choices.ts` | catalogs, `maybeChoice`, `applyChoice`, `dismissChoice`, taunts |
| `src/engine/returns.ts` | equity / FD / house ticks |
| `src/engine/netWorth.ts` | live and ending piles |
| `src/engine/economy.ts` | paycheck outflows; `transferToMarket` |
| `src/engine/tick.ts` | insert choice + pass rng into returns |
| `src/engine/ending.ts` | net-worth win check |
| `src/engine/state.ts` | `startGame` split rent/living |
| `src/engine/bosses.ts` | rent-spike destination (rent vs living) |
| `src/store/gameStore.ts` | `resolveChoice`, `transferToMarket`, `openChoice` |
| `src/ui/Dashboard.tsx` | three buckets; mobile fold |
| `src/ui/ChoiceModal.tsx` | house/car/marriage/kid/taunt |
| `src/ui/GameLoop.tsx` | no change if it already skips non-`playing` |
| `src/ui/EndReceipt.tsx` | net-worth lines |
| `src/ui/SetupScreen.tsx` | default target ₹75L |
| `docs/PROJECT.md` | pointer + new money rules |

## 14. Constraints for implementers

- TypeScript strict; no `any`
- Engine stays pure; tests before UI
- Do not auto-invest leftover cash (player transfer and planned SIP only)
- Do not reset cash each month
- Do not liquidate to fund SIP
- Do not liquidate to pay a dismissed choice
- Dark theme default; use CSS variables
- Vitest ignore `**/._*`
- Mobile: playable first screen; do not clone a second app
- Suggested build order (one PR-able slice each): (1) rent split + loans + house + net-worth ending + tests (2) FD, equity noise, transfer, HUD desktop/mobile (3) car, marriage, kid, taunts, `ChoiceModal`

## 15. Copy tone

Keep Breaking-News bosses and ledger dry. Choice copy is family-WhatsApp: specific, short, mean-but-not-cruel. Cheap wedding is funny; do not punch down on the child.
