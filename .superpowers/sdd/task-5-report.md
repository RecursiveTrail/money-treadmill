# Task 5 report

## RED

- Added `src/engine/choices.test.ts` with house affordability, auto-offer, cash/STCG purchase, dismissal, July reminder, unaffordable-tier, and paused-tick coverage.
- Ran `npm test -- src/engine/choices.test.ts`.
- Expected failure observed: Vite could not resolve the not-yet-created `./choices` module.

## GREEN

- Added the house catalog and pure choice mutations in `choices.ts`.
- Split the monthly tail in `tick.ts`; choice resolution now applies the choice and resumes SIP, compounding, boss handling, and month completion.
- Wired RNG through `continueMonth` and `payPending`, while keeping the store and `EventModal` action no-argument.
- Added the responsive house modal, net-worth headline, portfolio subline, and manual House action.
- Updated tick helpers to dismiss choices during long-running simulations.

## Verification

- `npm test -- src/engine/choices.test.ts src/engine/tick.test.ts`: 13 tests passed.
- `npm test`: 14 files and 61 tests passed.
- `npx tsc -b`: passed.
- IDE diagnostics on all changed source files: no errors.
- Manual browser check: default setup starts and dashboard shows net worth, portfolio, living expenses, and rent.

## Important findings follow-up

- Added a regression test proving `resolveChoice` is a no-op for a playing state without a pending choice; observed it fail by advancing the month before the fix.
- Guarded `resolveChoice` so only a successfully resolved awaiting choice continues the month tail.
- Short-circuited `maybeChoice` after each ordered life-choice check before evaluating the taunt.
- `npm test -- src/engine/choices.test.ts src/engine/tick.test.ts`: 2 files and 14 tests passed.
- `npm test`: 14 files and 62 tests passed.
