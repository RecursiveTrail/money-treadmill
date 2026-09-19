# Project knowledge — The Middle-Class Treadmill

Satirical idle/RNG game: a salaried Indian employee tries to hit a FIRE corpus and is judged on **after-tax, inflation-adjusted rupees**. Built for Recursive Trail.

**Read this first** when changing gameplay, money math, the tick loop, or UI that reads game state. The full v1 design is in `docs/superpowers/specs/2026-09-18-middle-class-treadmill-design.md`. The live optional house/car/marriage/kid, net-worth win, and balance-sheet HUD rules are in `docs/superpowers/specs/2026-09-19-optional-life-commitments-design.md`; that spec wins where it changes v1. SIP cap, gated events, EMI HUD, offer affordability, and the action dock are in `docs/superpowers/specs/2026-09-20-honest-money-and-action-dock-design.md`; that spec wins where it changes earlier specs. The original PRD is `docs/prd.md` (several loops there are outdated — spec + this file win).

## Commands

```bash
npm run dev      # Vite at http://localhost:5173
npm test         # Vitest (node)
npm run build    # tsc -b && vite build
```

GitHub Pages: push to `main` runs `.github/workflows/deploy-pages.yml` (test + build + deploy). Live URL is `https://<org>.github.io/money-treadmill/`. Local Pages-shaped build: `BASE_PATH=/money-treadmill/ npm run build`. `vite.config.ts` uses `BASE_PATH` when set, otherwise `/`.

This repo often lives on **exFAT**. macOS creates `._*` AppleDouble files. Vitest must `exclude: ['**/._*']` (`vite.config.ts`). Never commit `._*` (already in `.gitignore`). If tests suddenly fail with `Unexpected "\x00"`, delete `src/**/._*` and re-run.

## Architecture

Three layers. **Do not move money rules into React or Zustand.**

```
src/engine/   pure TypeScript — GameState in, GameState out
src/store/    Zustand — holds one GameState, thin actions
src/ui/       screens + GameLoop interval
```

| Layer | Owns | Must not own |
|---|---|---|
| Engine | Paycheck, SIP, STCG, events, bosses, ending, phases | `setInterval`, `Date.now`, React |
| Store | `startGame`, `tick`, `payPending`, `resolveChoice`, `openChoice`, `setSip`, `transferToMarket`, pause/speed/reset | Interval, money formulas |
| UI | Render, `GameLoop` timer, theme | Tick math |

Store `tick` is `set(tick(get(), Math.random))`. `GameLoop` calls `store.tick` through a **ref** so the interval does not go stale. Interval only runs when `phase === 'playing'` and `!isPaused`. Speeds: `TICK_MS` = `{ 1: 2000, 2: 1000, 4: 500 }`.

Import engine `startGame` as `startGameFromSetup` so it does not collide with the store action.

## Monthly pipeline (do not reorder)

Age on the state **is** the month being simulated. Age increments **after** SIP/boss.

1. `beginMonth` — `needsAnnualBoss = ageMonths === 0 && yearsPlayed > 0`; paycheck pays `livingExpenses + rent + EMIs` and amortizes loans; if `rng() < 0.30`, pick uniformly from life events that match owned house/car (`eligibleLifeEvents`); pause on `awaitingEvent` only when that pool is non-empty (otherwise continue the month).
2. `continueMonth` — pay event if any; offer at most one optional choice (priority marriage → kid → house → car → taunt); after resolution, SIP (`min(plannedSip, cash)`, never liquidate to SIP), then FD/equity/house returns; if annual boss, pause on `awaitingBoss`.
3. `applyBossAndFinish` — apply effect; `oneShotBill` uses `payBill`; extra boss ledger amount is **0** when the bill was already logged.
4. `finishMonth` — increment age; wrap 12 → July, `yearsPlayed += 1`. If `ageYears === targetRetirementAge && ageMonths === 0`, **end without playing that July**.

`tick(state, rng)` no-ops unless `phase === 'playing'`. `payPending` routes event → `continueMonth`, boss → `applyBossAndFinish`.

**Calendar:** `ageMonths === 0` is always **July**. Origin year **2026**. `calendarYear = 2026 + yearsPlayed + (ageMonths >= 6 ? 1 : 0)`.

Default run length: **240** paychecks (25y 0m → 44y 11m), then receipt at 45 with `yearsPlayed === 20`.

## Money rules

- Cash **carries over**. `cashBuffer += salary - expenses`. Do not reset the buffer each month.
- Live monthly expenses are `livingExpenses + rent + loan EMIs`. Buying a house sets `rent = 0`.
- Leftover cash is **not** auto-invested. Only `plannedSip` goes into the portfolio.
- Planned SIP is capped at investable cash: leftover FD + salary − living − rent − EMIs between months; leftover cash only when this month’s SIP is still pending. Slider and `plannedSip` snap down. `applySip` still never liquidates.
- HUD inflows list EMI lines next to rent.
- Forced sell: `totalSell = deficit + Math.round(deficit * 0.20)`. If portfolio cannot cover → `bankrupt`. Then clamp `investedAmount = min(investedAmount, portfolioValue)`.
- LTCG at the end: tax portfolio gains, then calculate inflation-adjusted net worth from after-tax portfolio + cash + home equity. Win if that real net worth meets `targetCorpusToday` (default ₹75L). Cars never count as assets.
- Starting LTCG 10%; year-2 boss sets 12.5%.
- Cash earns FD returns monthly at `1.05 ** (1 / 12)`. Equity uses `1 + 0.01 + 0.04 * (rng() - 0.5)`. The player may move FD cash one-way to equity with `transferToMarket`.
- Integer rupees after every multiply (`Math.round`).
- Ages must be **integers** (`validateSetup`).

## Content

- 15 life events in `src/engine/events.ts`. After the 30% roll, uniform pick from `eligibleLifeEvents` (society/plumber require a house; car service requires a car).
- Annual bosses in `src/engine/bosses.ts`: years 1–3 named; year 4+ is `(yearsPlayed - 4) % 6`. `getAnnualBoss` throws if `yearsPlayed < 1`.
- House, car, marriage, and one child are optional. Shaadi/bacche auto-offer and HUD buttons require `WEDDING_MIN` / `BIRTH_COST` payable (cash then STCG), same helper as down payment (`canPayFromBalance` in `loans.ts`). January/July flavour taunts cost ₹0 and never displace a real offer.
- Opening July has **no** boss.

## File map

| Path | Role |
|---|---|
| `src/engine/types.ts` | `GameState`, phases, events, bosses, ending |
| `src/engine/defaults.ts` | Constants + `DEFAULT_SETUP` |
| `src/engine/calendar.ts` | Month/year labels |
| `src/engine/validate.ts` | Setup errors |
| `src/engine/state.ts` | `startGame`, `resetToSetup`, `pushLedger` (cap 50, newest first) |
| `src/engine/economy.ts` | `liquidate`, paycheck/bills/SIP, `sipCap` / `clampPlannedSip`, `transferToMarket` |
| `src/engine/events.ts` / `bosses.ts` / `ending.ts` | Content + receipt math |
| `src/engine/loans.ts` | EMI calculation, loan origination/amortization, `canPayFromBalance`, down-payment affordability |
| `src/engine/choices.ts` | Optional commitments, offer priority, resolution, taunts |
| `src/engine/returns.ts` | Equity noise, FD return, house appreciation |
| `src/engine/netWorth.ts` | Live net worth and home equity |
| `src/engine/tick.ts` | Phase machine |
| `src/store/gameStore.ts` | Zustand |
| `src/ui/GameLoop.tsx` | Interval only |
| `src/ui/SetupScreen.tsx` | Setup form |
| `src/ui/Dashboard.tsx` | Classic HUD |
| `src/ui/ActionDock.tsx` / `EndReceipt.tsx` | Pending event/boss/choice strip; end receipt |
| `src/ui/ChoiceModal.tsx` | House/car/shaadi tier picker only when `choicePickerOpen` (after Choose or HUD Choose) |
| `src/ui/ledgerText.ts` | Skip appending ₹ if `text` already has `₹` |
| `src/ui/theme.ts` / `ThemeToggle.tsx` | Dark default; `localStorage.theme` |
| `src/lib/formatInr.ts` | Indian grouping `₹1,00,000` |
| `src/index.css` | Theme CSS variables (`:root` light, `html.dark` dark) |

## UI / theme

- Default theme is **dark** (`html.dark` unless `localStorage.theme === 'light'`).
- Colors live in CSS variables (`--app-bg`, `--money`, `--expense`, …). Prefer those over hard-coded `slate-*` so both themes stay in sync.
- App phases: `setup` → form; `playing` / `awaiting*` → dashboard with scrollable HUD; pending event/boss/choice render in `ActionDock` at the top (not a blocking scrim). House/car/shaadi pickers are `ChoiceModal` only after **Choose**. Do not block the dashboard with `EventModal`. `ended` → receipt only.
- On phones the first screen remains playable; investments, EMIs, FD controls, and ledger sit in the **Details** fold.

## Tests

Engine tests are required for money and tick changes. Key files: `economy.test.ts`, `tick.test.ts`, `ending.test.ts`, `bosses.test.ts`, `validate.test.ts`.

When adding a month-loop test, inject RNG (`() => 0.99` = no events). Auto-resolve bosses with `payPending`.

## Known issues (do not “fix” silently)

Retune only as an explicit product decision if skipping every optional commitment still always wins. The house EMI is the intended source of tightness; do not paper over balance issues by changing end-game math alone.

Other nits: ledger `text` sometimes embeds `formatInr` (SIP/liquidation) and sometimes does not (salary). `ledgerLine` uses `text.includes('₹')`. Prefer one convention if you touch both engine strings and the feed.

## Conventions

- TypeScript **strict**, no `any`.
- No backend, save/load, or Web Worker in v1.
- Do not add a debug “skip to end” unless asked.
- Keep engine functions pure and unit-tested before changing UI.
- Money copy uses Indian grouping via `formatInr`.
