# Honest money and action dock — Design Spec

Date: 2026-09-20
Status: Ready for implementation planning
Product: The Middle-Class Treadmill (Indian Tax Edition)
Amends: `docs/superpowers/specs/2026-09-19-optional-life-commitments-design.md`
Source: `docs/ideas/idea-1.txt`

Where this file and earlier specs disagree, **this file wins**. Unmentioned rules still apply: tick order, integer rupees, SIP never sells funds, bills may STCG-liquidate, no React in the engine, opening July has no boss, retirement July is not played, cash carries over, leftover cash is not auto-invested.

## 1. Goal

The month on screen must match the month in the engine, and a pending bill must not cover the dashboard.

SIP cannot be planned or invested above investable cash. House-only and car-only life events cannot fire without that asset. EMIs show on the inflows card next to rent. House, car, shaadi, and bacche are not offered (auto or HUD) until the player can pay the minimum. Pending events, bosses, and choices live in a full-width dock at the top of the dashboard so the player can still scroll cash, EMIs, and the ledger. Multi-option pickers (house, car, wedding spend) open a modal only after **Choose**.

## 2. Product rules (locked)

| Rule | Decision |
|---|---|
| SIP plan | Slider max and stored `plannedSip` snap down to investable cash. Never sit above it. |
| SIP debit | `min(plannedSip, cash)` after paycheck and any event. Never liquidate to fund SIP. |
| Month cash | Never left negative. If bills still don't fit after SIP is 0, STCG-liquidate. If that fails, bankrupt. |
| EMI HUD | Home and car EMI lines sit with salary, living, and rent. |
| Events | 30% roll unchanged. Uniform pick from events that match owned assets. |
| House-only events | `society` (maintenance + sinking fund) and tank/plumber require `house !== null`. |
| Car-only events | Car service requires `ownedCar`. |
| Offer gate | Auto-offer and HUD button share one gate: minimum payable (cash first, then portfolio with 20% STCG). |
| House / car minimum | Cheapest tier's 20% down payment (unchanged math). |
| Shaadi minimum | `WEDDING_MIN` (₹2,00,000). Bigger spend can still bankrupt. |
| Bacche minimum | `BIRTH_COST` (₹1,50,000). |
| Decline | Always valid once offered. |
| Pending UI | Full-width dock under the header. No full-screen scrim for events/bosses/taunts/kid. |
| Picker modal | House, car, and shaadi only, after **Choose** (or a HUD click that means Choose). |
| Calendar | Still pauses on `awaitingEvent` / `awaitingBoss` / `awaitingChoice`. |

## 3. Non-goals

- Cancel-vs-pay subscription bills (follow-up from `idea-1.txt`)
- Selling or upgrading house/car, prepaying EMIs
- Retuning default salary/SIP/win rates
- Save/load, backend, new phases, an action queue
- Changing STCG 20%, FD/equity formulas, or ending math
- Auto-investing leftover cash

## 4. Architecture

Same three layers. `GameLoop` still ticks only when `phase === 'playing'` and `!isPaused`. Tick order does not change.

```
src/engine/economy.ts    sipCap, clamp planned SIP; existing applySip / liquidate
src/engine/loans.ts      shared canPayFromBalance; down-payment helper uses it
src/engine/events.ts     eligible pool + pick
src/engine/choices.ts    same money gate for auto-offer and openChoice
src/ui/ActionDock.tsx    full-width pending strip
src/ui/ChoiceModal.tsx   picker only when choicePickerOpen
src/store/gameStore.ts   clamp setSip; choicePickerOpen UI flag
```

`pendingEvent`, `pendingChoice`, and `pendingBoss` stay on `GameState`. No new engine phase.

Store additions (UI only, not engine):

- `choicePickerOpen: boolean`
- `openChoicePicker()` / `closeChoicePicker()` — no-ops unless `phase === 'awaitingChoice'` and the pending kind is house, car, or marriage
- `openChoice(kind)` also sets `choicePickerOpen` true for house, car, and marriage (HUD click is Choose)
- `setSip` clamps with `sipCap`
- `resolveChoice` / `payPending` / `startGame` / `resetToSetup` set `choicePickerOpen` false

`payPending` still only pays events and bosses.

### 4.1 Isolation

| Unit | Does | Input | Depends on |
|---|---|---|---|
| `canPayFromBalance` | Cash, else STCG-sized portfolio, covers an amount | cash, portfolio, rupees | `STCG_RATE` |
| `sipCap` | Max planned SIP for this state | `GameState` | loans, salary, living, rent, cash |
| `clampPlannedSip` | Returns state with `plannedSip = min(plannedSip, sipCap)` | `GameState` | `sipCap` |
| `eligibleLifeEvents` | Events legal for this life | `GameState` | house, ownedCar |
| `maybeChoice` / `openChoice` | Offer only if minimum payable | `GameState` | `canPayFromBalance` |
| `ActionDock` | Renders pending + Pay/Choose/decline | store | none of the money formulas |

## 5. Money details

### 5.1 Investable cash / SIP cap

Monthly outflow is `livingExpenses + rent + sum(loan.emi)`.

Next `applySip` is later **this** month only when paycheck has run and SIP has not: `awaitingEvent`, or `awaitingChoice` with `pendingChoice.source === 'auto'`. Otherwise the next SIP is next month (`playing`, HUD-opened choice, `awaitingBoss` after this month's SIP).

`sipCap(state)`:

- This-month SIP still pending: `max(0, cashBuffer)`. Cash already includes salary minus outflow. Do **not** subtract a pending event bill (a one-shot may make this SIP partial; it must not permanently lower `plannedSip`).
- Otherwise: `max(0, cashBuffer + monthlySalary - outflow)`.

`setSip(amount)` stores `min(round(amount), sipCap)`, never below 0. Slider `max` is `sipCap` (not `monthlySalary`).

After any engine transition that raises outflow or lowers cash in a lasting way (originate a loan, living-expense bump, down payment), run `clampPlannedSip`. `applySip` stays `min(plannedSip, max(cashBuffer, 0))` and never calls `liquidate`.

### 5.2 Negative month

Paycheck still deducts living, rent, and EMIs, then liquidates if `cashBuffer < 0`. Event and boss bills still use `payBill` (liquidate on shortfall). After those, cash is 0 or positive, or the run is `bankrupt`. SIP is not part of that cover.

### 5.3 EMI on the HUD

Inflows/outflows card lists each live loan the same way as rent: `Home EMI −₹…` / `Car EMI −₹…`. Engine already books them in `applyPaycheck`; this is display only.

### 5.4 Event pool

Keep `EVENT_CHANCE = 0.30`. If the roll hits, `pickLifeEvent(state, rng)` draws uniformly from `eligibleLifeEvents(state)`.

| Event id | Requires |
|---|---|
| `society`, `plumber` | `house !== null` |
| `car-sensor` | `ownedCar` |
| All others | Always eligible |

If the eligible list is empty, skip the event and continue the month (current catalogs always have always-eligible events; the skip is a hard fallback).

### 5.5 Offer affordability

`canPayFromBalance(cash, portfolio, amount)` is true if `cash >= amount`, else if `portfolio >= round((amount - cash) * 1.20)`.

- House: existing cheapest-tier down payment via that helper (2 BHK 20%).
- Car: cheapest tier (used) 20%.
- Marriage: `amount = WEDDING_MIN`.
- Kid: `amount = BIRTH_COST`.

`maybeMarriage` / `maybeKid` / `maybeHouse` / `maybeCar` and the matching `openChoice` branches no-op unless the gate passes. Age/ownership unlocks stay as in the 2026-09-19 spec (`ageYears >= 30`, married for kid, etc.). July reminders use the same money gate: no reminder until the minimum is payable.

Accepting a wedding above `WEDDING_MIN` still uses `payBill` and can liquidate or bankrupt.

HUD buttons use the same predicates as `openChoice` (Dashboard already hides house/car when no payable tier; extend that to shaadi and bacche, and keep house/car in sync with the helper).

## 6. Action dock

`Dashboard` always mounts while not setup/ended. `App` does **not** mount a blocking `EventModal` scrim. `ChoiceModal` mounts only when `choicePickerOpen`.

Place `ActionDock` below the header, above the inflows/cash grid.

| Pending | Dock | Primary | Secondary |
|---|---|---|---|
| `awaitingEvent` | Title, copy, cost | Pay ₹X → `payPending` | — |
| `awaitingBoss` with `oneShotBill` | Title, copy, amount | Pay ₹X → `payPending` | — |
| `awaitingBoss` otherwise | Title, copy | Continue → `payPending` | — |
| Choice `taunt` | Title, copy | Continue → `resolveChoice({ action: 'dismiss' })` | — |
| Choice `kid` | Title, copy, birth cost | Yes → accept | Not yet → dismiss |
| Choice `house` / `car` / `marriage` | Title, copy | Choose → `openChoicePicker` | Keep renting / Not yet → dismiss |

While the dock is up, SIP, FD transfer, ledger, and theme remain usable. `openChoice` from HUD buttons still no-ops unless `phase === 'playing'`.

### 6.1 Picker

House, car, marriage: **Choose** (dock) or a HUD button click sets `awaitingChoice` (engine) and `choicePickerOpen` (store). HUD house/car/shaadi click is Choose — open the picker immediately. The picker has **Back** (and backdrop click) that closes without resolving: `choicePickerOpen = false`; phase stays `awaitingChoice`; dock remains. Accept or dismiss: existing `resolveChoice`; picker closes.

Kid and taunt never open the picker.

Unaffordable tiers stay disabled as today. Unpayable HUD / Choose is a no-op.

## 7. Data flow

1. `tick` → `beginMonth` (paycheck, maybe event). If `awaitingEvent`, dock shows Pay. Interval stops.
2. Pay → `continueMonth` → maybe `maybeChoice`. If gated off, skip to SIP. If offered, dock shows Choose / Yes.
3. Decline or accept → existing resolution; `clampPlannedSip`; auto source continues SIP/returns/boss; HUD source returns to `playing`.
4. `applySip` then returns; July boss dock if needed; `finishMonth`.

## 8. Testing

Engine tests required:

- `sipCap` in `playing` equals leftover + salary − living − rent − EMIs; slider/`setSip` cannot exceed it.
- After a home loan, `plannedSip` above the new cap snaps down; SIP debit still never liquidates.
- Paycheck + EMI that exceed cash liquidate; cash not negative; SIP skipped or partial only from leftover.
- No house: 100 forced event picks never return `society` or `plumber`. No car: never `car-sensor`. With house and car: those ids can appear.
- Age 30 with cash+portfolio below `WEDDING_MIN`: `maybeChoice` does not pause; HUD `openChoice('marriage')` no-ops. Above the min: offer appears.
- Kid gate uses `BIRTH_COST`. House/car unchanged except they share `canPayFromBalance`.
- Tick order and `GameLoop` idle on `awaiting*` unchanged.

UI checks (manual or lightweight): dock visible without scrim; dashboard scrollable; picker only after Choose / HUD click.

## 9. File map (delta)

| Path | Change |
|---|---|
| `src/engine/loans.ts` | `canPayFromBalance`; `canAffordDownPayment` delegates |
| `src/engine/economy.ts` | `sipCap`, `clampPlannedSip`; `applySip` unchanged in spirit |
| `src/engine/events.ts` | Eligibility + `pickLifeEvent(state, rng)` |
| `src/engine/choices.ts` | Marriage/kid money gate; clamp after accept |
| `src/engine/tick.ts` | Pass state into event pick; clamp after month stages that change outflow |
| `src/store/gameStore.ts` | Clamp `setSip`; `choicePickerOpen` |
| `src/ui/ActionDock.tsx` | New |
| `src/ui/Dashboard.tsx` | Dock slot; EMI lines; shaadi/kid button gates |
| `src/ui/ChoiceModal.tsx` | Picker only; close-without-resolve |
| `src/App.tsx` | Drop blocking EventModal; conditional ChoiceModal |
| `docs/PROJECT.md` | SIP cap, event gates, dock; same PR as implementation |

## 10. Docs

Implementation must update `docs/PROJECT.md` in the same change: SIP cap, event eligibility, offer money gate, ActionDock instead of blocking event modal. This spec wins if they drift.
