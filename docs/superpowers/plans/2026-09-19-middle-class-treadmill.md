# Middle-Class Treadmill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a playable Vite React game where a salaried Indian player sets a FIRE plan, survives monthly ticks / events / July bosses, and wins or loses on after-tax real rupees.

**Architecture:** Pure TypeScript engine owns all money and phase transitions. Zustand holds one `GameState` and calls the engine. React renders screens and owns `setInterval` in `GameLoop` (refs, no stale closures). No tick math in components.

**Tech Stack:** Vite 6, React 19, TypeScript strict, Tailwind CSS 3, Zustand 5, lucide-react, Vitest (node environment).

## Global Constraints

- TypeScript strict; no `any`
- Zustand does **not** contain the money rules; the store calls a pure engine
- Do not put tick math in React components
- Do not auto-invest leftover cash (planned SIP only)
- Do not reset cash each month
- Do not liquidate to fund SIP
- Dark theme: `slate-900` background, `emerald-400` money, `rose-500` expenses
- Indian rupee formatting in the UI (`₹1,00,000`)
- Calendar origin July 2026; `ageMonths === 0` is always July
- 1x tick = 2000 ms / month; 2x = 1000 ms; 4x = 500 ms
- All money math in integer rupees (`Math.round` after multiply)
- Desktop 1280px is the target; no extra design system
- No backend, no save/load, no Web Worker, no React Testing Library
- Spec: `docs/superpowers/specs/2026-09-18-middle-class-treadmill-design.md`

---

## File map

Create these files. Do not invent others.

| Path | Responsibility |
|---|---|
| `package.json` | Scripts and dependencies |
| `vite.config.ts` | Vite + Vitest (`src/**/*.test.ts`, node env) |
| `tsconfig.json` / `tsconfig.app.json` / `tsconfig.node.json` | Strict TS |
| `tailwind.config.js` / `postcss.config.js` | Tailwind |
| `index.html` | Mount `#root` |
| `src/main.tsx` / `src/App.tsx` / `src/index.css` | Boot + theme + shake keyframes |
| `src/vite-env.d.ts` | Vite client types |
| `src/lib/formatInr.ts` | `formatInr(n: number): string` |
| `src/lib/formatInr.test.ts` | INR grouping tests |
| `src/engine/types.ts` | All shared types + `Rng` |
| `src/engine/defaults.ts` | Constants + `DEFAULT_SETUP` |
| `src/engine/calendar.ts` | `MONTH_NAMES`, `calendarMonth`, `calendarYear`, `ageLabel`, `monthLabel` |
| `src/engine/validate.ts` | `validateSetup(setup): string[]` |
| `src/engine/state.ts` | `emptyState`, `startGame`, `resetToSetup`, `pushLedger` |
| `src/engine/economy.ts` | `liquidate`, `applyPaycheck`, `payBill`, `applySip`, `compound` |
| `src/engine/events.ts` | `LIFE_EVENTS`, `pickLifeEvent` |
| `src/engine/bosses.ts` | `getAnnualBoss` |
| `src/engine/ending.ts` | `evaluateEnding` |
| `src/engine/tick.ts` | `beginMonth`, `continueMonth`, `applyBossAndFinish`, `finishMonth`, `tick`, `payPending` |
| `src/engine/calendar.test.ts` | Calendar + labels |
| `src/engine/validate.test.ts` | Setup validation |
| `src/engine/economy.test.ts` | Spec tests 1–6 |
| `src/engine/ending.test.ts` | Spec test 8 |
| `src/engine/bosses.test.ts` | Spec test 7 + rotation index |
| `src/engine/tick.test.ts` | Spec tests 9–11 |
| `src/store/gameStore.ts` | Zustand actions |
| `src/store/gameStore.test.ts` | Store no-ops and start/reset |
| `src/ui/GameLoop.tsx` | Interval only |
| `src/ui/SetupScreen.tsx` | Setup form |
| `src/ui/Dashboard.tsx` | Classic HUD |
| `src/ui/BufferGauge.tsx` | Cash tank |
| `src/ui/LedgerFeed.tsx` | Terminal ledger |
| `src/ui/EventModal.tsx` | Event + boss overlay |
| `src/ui/EndReceipt.tsx` | Win/lose/bankrupt receipt |
| `src/ui/AnimatedNumber.tsx` | Portfolio counter |

---

### Task 1: Scaffold and `formatInr`

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`, `tailwind.config.js`, `postcss.config.js`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/index.css`, `src/vite-env.d.ts`, `src/lib/formatInr.ts`, `src/lib/formatInr.test.ts`
- Modify: `.gitignore` (add Vite defaults if missing)

**Interfaces:**
- Consumes: nothing
- Produces: `formatInr(amount: number): string` — Indian grouping, always prefixed with `₹`, negative as `-₹1,00,000`

- [ ] **Step 1: Write the failing test**

Create `src/lib/formatInr.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { formatInr } from './formatInr';

describe('formatInr', () => {
  it('groups the last three digits, then pairs', () => {
    expect(formatInr(100000)).toBe('₹1,00,000');
    expect(formatInr(40_00_000)).toBe('₹40,00,000');
    expect(formatInr(500)).toBe('₹500');
    expect(formatInr(0)).toBe('₹0');
    expect(formatInr(-36000)).toBe('-₹36,000');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/formatInr.test.ts`
Expected: FAIL (no `package.json` / module not found)

If npm is not installed yet, that is the expected failure. Continue.

- [ ] **Step 3: Write scaffold + minimal `formatInr`**

`package.json`:

```json
{
  "name": "money-treadmill",
  "private": true,
  "version": "0.0.1",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "lucide-react": "^0.468.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "zustand": "^5.0.2"
  },
  "devDependencies": {
    "@types/react": "^19.0.2",
    "@types/react-dom": "^19.0.2",
    "@vitejs/plugin-react": "^4.3.4",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.49",
    "tailwindcss": "^3.4.17",
    "typescript": "~5.7.2",
    "vite": "^6.0.6",
    "vitest": "^2.1.8"
  }
}
```

`vite.config.ts`:

```ts
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
```

`tsconfig.json`:

```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" }
  ]
}
```

`tsconfig.app.json`:

```json
{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.app.tsbuildinfo",
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedSideEffectImports": true
  },
  "include": ["src"]
}
```

`tsconfig.node.json`:

```json
{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.node.tsbuildinfo",
    "target": "ES2022",
    "lib": ["ES2023"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedSideEffectImports": true
  },
  "include": ["vite.config.ts"]
}
```

`tailwind.config.js`:

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      keyframes: {
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-6px)' },
          '75%': { transform: 'translateX(6px)' },
        },
      },
      animation: {
        shake: 'shake 0.35s ease-in-out 0s 3',
      },
    },
  },
  plugins: [],
};
```

`postcss.config.js`:

```js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

`index.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>The Middle-Class Treadmill</title>
  </head>
  <body class="bg-slate-900">
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`src/vite-env.d.ts`:

```ts
/// <reference types="vite/client" />
```

`src/index.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

html,
body,
#root {
  min-height: 100%;
}
```

`src/main.tsx`:

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

`src/App.tsx`:

```tsx
export default function App() {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <p className="p-6 text-emerald-400">The Middle-Class Treadmill</p>
    </div>
  );
}
```

`src/lib/formatInr.ts`:

```ts
export function formatInr(amount: number): string {
  const rounded = Math.round(amount);
  const sign = rounded < 0 ? '-' : '';
  const digits = String(Math.abs(rounded));
  if (digits.length <= 3) {
    return `${sign}₹${digits}`;
  }
  const last3 = digits.slice(-3);
  let rest = digits.slice(0, -3);
  const pairs: string[] = [];
  while (rest.length > 2) {
    pairs.unshift(rest.slice(-2));
    rest = rest.slice(0, -2);
  }
  if (rest.length > 0) {
    pairs.unshift(rest);
  }
  return `${sign}₹${pairs.join(',')},${last3}`;
}
```

Append to `.gitignore` if not already present:

```
node_modules/
dist/
*.local
```

Then: `npm install`

- [ ] **Step 4: Run tests and typecheck**

Run: `npm test -- src/lib/formatInr.test.ts`
Expected: PASS

Run: `npx tsc -b --pretty false`
Expected: exit 0

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json vite.config.ts tsconfig.json tsconfig.app.json tsconfig.node.json tailwind.config.js postcss.config.js index.html src .gitignore
git commit -m "chore: scaffold Vite React app and INR formatter"
```

---

### Task 2: Engine types, defaults, calendar, validation, `startGame`

**Files:**
- Create: `src/engine/types.ts`, `src/engine/defaults.ts`, `src/engine/calendar.ts`, `src/engine/validate.ts`, `src/engine/state.ts`, `src/engine/calendar.test.ts`, `src/engine/validate.test.ts`, `src/engine/state.test.ts`

**Interfaces:**
- Consumes: nothing from Task 1 except the test runner
- Produces:
  - types in `src/engine/types.ts` (copy the spec types; add `export type Rng = () => number`)
  - `DEFAULT_SETUP: SetupConfig`
  - `STARTING_CASH = 50000`, `ORIGIN_YEAR = 2026`, `EVENT_CHANCE = 0.30`, `MONTHLY_RETURN = 1.01`, `INFLATION = 0.07`, `STCG_RATE = 0.20`, `STARTING_LTCG = 0.10`, `LEDGER_CAP = 50`
  - `calendarMonth(ageMonths: number): number`
  - `calendarYear(yearsPlayed: number, ageMonths: number): number`
  - `ageLabel(ageYears: number, ageMonths: number): string` → `"25y 3m"`
  - `monthLabel(yearsPlayed: number, ageMonths: number): string` → `"Oct 2026"`
  - `validateSetup(setup: SetupConfig): string[]` — empty means valid
  - `startGame(setup: SetupConfig): GameState` — `phase: 'playing'`
  - `resetToSetup(state: GameState): GameState` — `phase: 'setup'`, keeps `state.setup` and `tickSpeed`
  - `pushLedger(state: GameState, kind: LedgerKind, text: string, amount: number): GameState`

- [ ] **Step 1: Write the failing tests**

`src/engine/calendar.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { ageLabel, calendarMonth, calendarYear, monthLabel } from './calendar';

describe('calendar', () => {
  it('maps ageMonths 0 to July', () => {
    expect(calendarMonth(0)).toBe(7);
    expect(calendarMonth(5)).toBe(12);
    expect(calendarMonth(6)).toBe(1);
    expect(calendarMonth(11)).toBe(6);
  });

  it('keeps 2026 through December of year 0, then January 2027', () => {
    expect(calendarYear(0, 0)).toBe(2026);
    expect(calendarYear(0, 5)).toBe(2026);
    expect(calendarYear(0, 6)).toBe(2027);
    expect(calendarYear(1, 0)).toBe(2027);
  });

  it('formats labels', () => {
    expect(ageLabel(25, 3)).toBe('25y 3m');
    expect(monthLabel(0, 3)).toBe('Oct 2026');
  });
});
```

`src/engine/validate.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { DEFAULT_SETUP } from './defaults';
import { validateSetup } from './validate';

describe('validateSetup', () => {
  it('accepts defaults', () => {
    expect(validateSetup(DEFAULT_SETUP)).toEqual([]);
  });

  it('rejects retirement at or before start age', () => {
    expect(validateSetup({ ...DEFAULT_SETUP, targetRetirementAge: 25 }).length).toBeGreaterThan(0);
  });

  it('rejects expenses >= salary', () => {
    expect(
      validateSetup({ ...DEFAULT_SETUP, monthlySalary: 50000, fixedExpenses: 50000 }).length,
    ).toBeGreaterThan(0);
  });

  it('rejects negative money', () => {
    expect(validateSetup({ ...DEFAULT_SETUP, plannedSip: -1 }).length).toBeGreaterThan(0);
  });
});
```

`src/engine/state.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { DEFAULT_SETUP, STARTING_CASH } from './defaults';
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
});

describe('pushLedger', () => {
  it('prepends and caps at 50', () => {
    let s = startGame(DEFAULT_SETUP);
    for (let i = 0; i < 55; i += 1) {
      s = pushLedger(s, 'system', `row ${i}`, 0);
    }
    expect(s.ledger).toHaveLength(50);
    expect(s.ledger[0]?.text).toBe('row 54');
  });
});

describe('resetToSetup', () => {
  it('returns to setup and keeps the last config', () => {
    const playing = startGame({ ...DEFAULT_SETUP, plannedSip: 10_000 });
    const reset = resetToSetup(playing);
    expect(reset.phase).toBe('setup');
    expect(reset.setup.plannedSip).toBe(10_000);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/engine/calendar.test.ts src/engine/validate.test.ts src/engine/state.test.ts`
Expected: FAIL with cannot find module

- [ ] **Step 3: Write minimal implementation**

`src/engine/types.ts` — paste the spec types from §5 and add:

```ts
export type Rng = () => number;
```

Include `Phase`, `SetupConfig`, `LedgerKind`, `LedgerEntry`, `PendingEvent`, `BossEffect`, `PendingBoss`, `Ending`, `GameState` exactly as the spec names them.

`src/engine/defaults.ts`:

```ts
import type { SetupConfig } from './types';

export const ORIGIN_YEAR = 2026;
export const STARTING_CASH = 50_000;
export const STARTING_LTCG = 0.1;
export const EVENT_CHANCE = 0.3;
export const MONTHLY_RETURN = 1.01;
export const INFLATION_RATE = 0.07;
export const STCG_RATE = 0.2;
export const LEDGER_CAP = 50;
export const TICK_MS: Record<1 | 2 | 4, number> = { 1: 2000, 2: 1000, 4: 500 };

export const DEFAULT_SETUP: SetupConfig = {
  startAgeYears: 25,
  targetRetirementAge: 45,
  monthlySalary: 100_000,
  fixedExpenses: 55_000,
  plannedSip: 30_000,
  targetCorpusToday: 40_00_000,
};
```

`src/engine/calendar.ts`:

```ts
import { ORIGIN_YEAR } from './defaults';

const MONTH_BY_AGE = [7, 8, 9, 10, 11, 12, 1, 2, 3, 4, 5, 6] as const;
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function calendarMonth(ageMonths: number): number {
  return MONTH_BY_AGE[ageMonths] ?? 7;
}

export function calendarYear(yearsPlayed: number, ageMonths: number): number {
  return ORIGIN_YEAR + yearsPlayed + (ageMonths >= 6 ? 1 : 0);
}

export function ageLabel(ageYears: number, ageMonths: number): string {
  return `${ageYears}y ${ageMonths}m`;
}

export function monthLabel(yearsPlayed: number, ageMonths: number): string {
  const month = calendarMonth(ageMonths);
  return `${MONTH_NAMES[month - 1]} ${calendarYear(yearsPlayed, ageMonths)}`;
}
```

`src/engine/validate.ts`:

```ts
import type { SetupConfig } from './types';

export function validateSetup(setup: SetupConfig): string[] {
  const errors: string[] = [];
  const money = [
    setup.monthlySalary,
    setup.fixedExpenses,
    setup.plannedSip,
    setup.targetCorpusToday,
  ];
  if (!Number.isFinite(setup.startAgeYears) || !Number.isFinite(setup.targetRetirementAge)) {
    errors.push('Ages must be numbers.');
  }
  if (setup.targetRetirementAge <= setup.startAgeYears) {
    errors.push('Retirement age must be after starting age.');
  }
  if (money.some((n) => !Number.isFinite(n) || n < 0)) {
    errors.push('Money fields must be zero or more.');
  }
  if (setup.fixedExpenses >= setup.monthlySalary) {
    errors.push('Expenses must be less than salary.');
  }
  return errors;
}
```

`src/engine/state.ts`:

```ts
import { ageLabel, monthLabel } from './calendar';
import { DEFAULT_SETUP, LEDGER_CAP, STARTING_CASH, STARTING_LTCG } from './defaults';
import type { GameState, LedgerKind, SetupConfig } from './types';

export function startGame(setup: SetupConfig): GameState {
  return {
    phase: 'playing',
    setup,
    ageYears: setup.startAgeYears,
    ageMonths: 0,
    yearsPlayed: 0,
    cashBuffer: STARTING_CASH,
    portfolioValue: 0,
    investedAmount: 0,
    monthlySalary: setup.monthlySalary,
    fixedExpenses: setup.fixedExpenses,
    plannedSip: setup.plannedSip,
    ltcgRate: STARTING_LTCG,
    pendingEvent: null,
    pendingBoss: null,
    needsAnnualBoss: false,
    ledger: [],
    ledgerSeq: 0,
    isPaused: false,
    tickSpeed: 1,
    ending: null,
  };
}

export function emptySetupState(): GameState {
  return { ...startGame(DEFAULT_SETUP), phase: 'setup' };
}

export function resetToSetup(state: GameState): GameState {
  return {
    ...startGame(state.setup),
    phase: 'setup',
    tickSpeed: state.tickSpeed,
  };
}

export function pushLedger(
  state: GameState,
  kind: LedgerKind,
  text: string,
  amount: number,
): GameState {
  const seq = state.ledgerSeq + 1;
  const entry = {
    id: String(seq),
    ageLabel: ageLabel(state.ageYears, state.ageMonths),
    monthLabel: monthLabel(state.yearsPlayed, state.ageMonths),
    kind,
    text,
    amount,
  };
  return {
    ...state,
    ledgerSeq: seq,
    ledger: [entry, ...state.ledger].slice(0, LEDGER_CAP),
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/engine/calendar.test.ts src/engine/validate.test.ts src/engine/state.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/engine
git commit -m "feat: add game types, defaults, calendar, and startGame"
```

---

### Task 3: Economy helpers

**Files:**
- Create: `src/engine/economy.ts`, `src/engine/economy.test.ts`

**Interfaces:**
- Consumes: `GameState`, `pushLedger`, `STCG_RATE`
- Produces:
  - `liquidate(state: GameState, deficit: number): GameState`
  - `applyPaycheck(state: GameState): GameState`
  - `payBill(state: GameState, cost: number, text: string): GameState`
  - `applySip(state: GameState): GameState`
  - `compound(state: GameState): GameState`

Liquidation (verbatim spec): `taxHaircut = Math.round(deficit * 0.20)`, `totalSell = deficit + taxHaircut`. If `portfolioValue < totalSell` → bankrupt: `phase: 'ended'`, `portfolioValue: 0`, `cashBuffer: 0`, `ending.result: 'bankrupt'` (fill other `Ending` fields from current numbers). Else subtract `totalSell`, clamp `investedAmount = min(investedAmount, portfolioValue)`, ledger `"Liquidated portfolio: −₹[totalSell] (includes 20% STCG)"` with negative amount.

`evaluateEnding` does not exist yet. For bankrupt, set:

```ts
ending: {
  result: 'bankrupt',
  yearsPlayed: state.yearsPlayed,
  grossPortfolio: 0,
  investedAmount: 0,
  ltcgRate: state.ltcgRate,
  tax: 0,
  afterTax: 0,
  cashLeft: 0,
  realPurchasingPower: 0,
  targetCorpusToday: state.setup.targetCorpusToday,
}
```

`payBill`: if `cost <= cashBuffer`, subtract cash and ledger the event text as negative. Else `payBill` sets cash to 0 after `liquidate(state, cost - cashBuffer)`.

`applySip`: `sip = min(plannedSip, max(cashBuffer, 0))`. Never liquidate. If sip === 0, ledger `"SIP skipped"` amount 0. If sip < plannedSip, `"SIP partial ₹X"`. Else `"SIP ₹X"`. Add sip to `investedAmount` and `portfolioValue`.

`compound`: `portfolioValue = Math.round(portfolioValue * 1.01)`.

`applyPaycheck`: `cashBuffer += monthlySalary - fixedExpenses`, two ledger lines (salary +, expense −). If cash < 0, `liquidate` the deficit then cash = 0.

- [ ] **Step 1: Write the failing tests**

`src/engine/economy.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { DEFAULT_SETUP } from './defaults';
import { applyPaycheck, applySip, compound, liquidate, payBill } from './economy';
import { startGame } from './state';

function withCash(cash: number, portfolio = 0) {
  return { ...startGame(DEFAULT_SETUP), cashBuffer: cash, portfolioValue: portfolio, investedAmount: portfolio };
}

describe('applyPaycheck', () => {
  it('adds salary minus expenses to existing cash', () => {
    const next = applyPaycheck(withCash(10_000));
    expect(next.cashBuffer).toBe(10_000 + 100_000 - 55_000);
  });

  it('liquidates STCG when expenses exceed cash + salary', () => {
    const next = applyPaycheck({
      ...withCash(0, 100_000),
      monthlySalary: 10_000,
      fixedExpenses: 40_000,
    });
    expect(next.cashBuffer).toBe(0);
    expect(next.portfolioValue).toBe(100_000 - 30_000 - 6_000);
    expect(next.phase).not.toBe('ended');
  });
});

describe('payBill', () => {
  it('sells deficit + 20% STCG from the portfolio', () => {
    const next = payBill(withCash(10_000, 100_000), 40_000, 'Hospital');
    expect(next.cashBuffer).toBe(0);
    expect(next.portfolioValue).toBe(64_000);
  });

  it('bankrupts when the portfolio cannot cover the sell', () => {
    const next = payBill(withCash(0, 10_000), 40_000, 'Ruin');
    expect(next.phase).toBe('ended');
    expect(next.ending?.result).toBe('bankrupt');
    expect(next.portfolioValue).toBe(0);
  });
});

describe('applySip', () => {
  it('invests only available cash and never liquidates', () => {
    const next = applySip({ ...withCash(12_000, 50_000), plannedSip: 30_000 });
    expect(next.cashBuffer).toBe(0);
    expect(next.portfolioValue).toBe(62_000);
    expect(next.investedAmount).toBe(62_000);
    expect(next.phase).not.toBe('ended');
  });

  it('skips SIP when cash is 0 and leaves portfolio unchanged before compound', () => {
    const before = withCash(0, 80_000);
    const next = applySip({ ...before, plannedSip: 30_000 });
    expect(next.portfolioValue).toBe(80_000);
    expect(next.investedAmount).toBe(80_000);
  });
});

describe('compound', () => {
  it('applies 1% and rounds to a rupee', () => {
    expect(compound(withCash(0, 100_000)).portfolioValue).toBe(101_000);
  });
});

describe('liquidate', () => {
  it('does nothing when deficit is 0', () => {
    const start = withCash(5, 9);
    expect(liquidate(start, 0).portfolioValue).toBe(9);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/engine/economy.test.ts`
Expected: FAIL cannot find module `./economy`

- [ ] **Step 3: Write `src/engine/economy.ts`**

```ts
import { formatInr } from '../lib/formatInr';
import { MONTHLY_RETURN, STCG_RATE } from './defaults';
import { pushLedger } from './state';
import type { Ending, GameState } from './types';

function bankruptEnding(state: GameState): Ending {
  return {
    result: 'bankrupt',
    yearsPlayed: state.yearsPlayed,
    grossPortfolio: 0,
    investedAmount: 0,
    ltcgRate: state.ltcgRate,
    tax: 0,
    afterTax: 0,
    cashLeft: 0,
    realPurchasingPower: 0,
    targetCorpusToday: state.setup.targetCorpusToday,
  };
}

export function liquidate(state: GameState, deficit: number): GameState {
  if (deficit <= 0) {
    return state;
  }
  const taxHaircut = Math.round(deficit * STCG_RATE);
  const totalSell = deficit + taxHaircut;
  if (state.portfolioValue < totalSell) {
    const wiped = {
      ...state,
      cashBuffer: 0,
      portfolioValue: 0,
      investedAmount: 0,
      phase: 'ended' as const,
      isPaused: true,
      pendingEvent: null,
      pendingBoss: null,
      ending: bankruptEnding(state),
    };
    return pushLedger(wiped, 'liquidation', 'Liquidated portfolio: wiped out (includes 20% STCG)', -state.portfolioValue);
  }
  const next: GameState = {
    ...state,
    portfolioValue: state.portfolioValue - totalSell,
    investedAmount: Math.min(state.investedAmount, state.portfolioValue - totalSell),
  };
  return pushLedger(
    next,
    'liquidation',
    `Liquidated portfolio: −${formatInr(totalSell)} (includes 20% STCG)`,
    -totalSell,
  );
}

export function applyPaycheck(state: GameState): GameState {
  let next = pushLedger(
    { ...state, cashBuffer: state.cashBuffer + state.monthlySalary - state.fixedExpenses },
    'salary',
    `Salary credited`,
    state.monthlySalary,
  );
  next = pushLedger(next, 'expense', 'Fixed expenses', -state.fixedExpenses);
  if (next.cashBuffer < 0) {
    const deficit = -next.cashBuffer;
    next = liquidate({ ...next, cashBuffer: 0 }, deficit);
  }
  return next;
}

export function payBill(state: GameState, cost: number, text: string): GameState {
  let next = pushLedger(state, 'event', text, -cost);
  if (cost <= next.cashBuffer) {
    return { ...next, cashBuffer: next.cashBuffer - cost };
  }
  const deficit = cost - next.cashBuffer;
  return liquidate({ ...next, cashBuffer: 0 }, deficit);
}

export function applySip(state: GameState): GameState {
  const sip = Math.min(state.plannedSip, Math.max(state.cashBuffer, 0));
  if (sip === 0) {
    return pushLedger(state, 'sip', 'SIP skipped', 0);
  }
  const labeled =
    sip < state.plannedSip ? `SIP partial ${formatInr(sip)}` : `SIP ${formatInr(sip)}`;
  return pushLedger(
    {
      ...state,
      cashBuffer: state.cashBuffer - sip,
      investedAmount: state.investedAmount + sip,
      portfolioValue: state.portfolioValue + sip,
    },
    'sip',
    labeled,
    -sip,
  );
}

export function compound(state: GameState): GameState {
  return { ...state, portfolioValue: Math.round(state.portfolioValue * MONTHLY_RETURN) };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/engine/economy.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/engine/economy.ts src/engine/economy.test.ts
git commit -m "feat: add paycheck, SIP, STCG liquidation, and compounding"
```

---

### Task 4: Events, bosses, ending

**Files:**
- Create: `src/engine/events.ts`, `src/engine/bosses.ts`, `src/engine/ending.ts`, `src/engine/ending.test.ts`, `src/engine/bosses.test.ts`, `src/engine/events.test.ts`

**Interfaces:**
- Consumes: `Rng`, `PendingEvent`, `PendingBoss`, `GameState`, `INFLATION_RATE`
- Produces:
  - `LIFE_EVENTS: readonly PendingEvent[]` — all 15 rows from spec §9.1
  - `pickLifeEvent(rng: Rng): PendingEvent` — `LIFE_EVENTS[Math.floor(rng() * LIFE_EVENTS.length)]`
  - `getAnnualBoss(yearsPlayed: number): PendingBoss`
  - `evaluateEnding(state: GameState): Ending` — win/lose only (not bankrupt); `real = afterTax / (1.07 ** yearsPlayed)`
  - `applyBossEffect(state: GameState, effect: BossEffect): GameState` — salary/expense/LTCG/flavour; `oneShotBill` is applied later in `applyBossAndFinish` via `payBill` (this function only mutates rates/amounts for non-bill effects, and for `oneShotBill` returns state unchanged)

Year 1–3 bosses and rotation `(yearsPlayed - 4) % 6` as spec §9.2. `Math.round` after salary/expense multipliers.

Boss copy (use these strings):

| yearsPlayed / index | id | title | copy | effect |
|---|---|---|---|---|
| 1 | hike-8 | Breaking News: Appraisal | Appraisal season. CTC hiked 8%. Stretch assignment attached. | `{ type: 'salaryMul', factor: 1.08 }` |
| 2 | ltcg-hike | Breaking News: LTCG | LTCG hiked to 12.5%. Indexation removed. | `{ type: 'setLtcg', rate: 0.125 }` |
| 3 | rent-spike | Breaking News: Inflation | Inflation spikes. Rent and the cook both want more. | `{ type: 'expenseAdd', amount: 2000 }` |
| rot 0 | hike-6 | Breaking News: Increment | Another increment. CTC hiked 6%. The treadmill speeds up. | `{ type: 'salaryMul', factor: 1.06 }` |
| rot 1 | cpi-5 | Breaking News: CPI | Official CPI is 5%. Your kirana already knew. | `{ type: 'expenseMul', factor: 1.05 }` |
| rot 2 | diwali-boss | Breaking News: Diwali | Company Diwali gift is a thali. The bill is yours. | `{ type: 'oneShotBill', amount: 15000 }` |
| rot 3 | tax-news | Breaking News: Panel | Panel to 'study' capital gains. Markets shrug. You do not. | `{ type: 'flavour' }` |
| rot 4 | fuel-rent | Breaking News: Fuel | Petrol and society charges quietly moved in. | `{ type: 'expenseAdd', amount: 1500 }` |
| rot 5 | promo | Breaking News: Promotion | Promoted. CTC hiked 10%. Inbox hiked 40%. | `{ type: 'salaryMul', factor: 1.10 }` |

- [ ] **Step 1: Write the failing tests**

`src/engine/events.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { LIFE_EVENTS, pickLifeEvent } from './events';

describe('LIFE_EVENTS', () => {
  it('has 15 events including the PRD four', () => {
    expect(LIFE_EVENTS).toHaveLength(15);
    expect(LIFE_EVENTS.map((e) => e.id)).toEqual(
      expect.arrayContaining(['wedding', 'root-canal', 'brewery', 'car-sensor']),
    );
  });

  it('picks by injected rng', () => {
    expect(pickLifeEvent(() => 0).id).toBe(LIFE_EVENTS[0]?.id);
  });
});
```

`src/engine/bosses.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { applyBossEffect, getAnnualBoss } from './bosses';
import { DEFAULT_SETUP } from './defaults';
import { startGame } from './state';

describe('getAnnualBoss', () => {
  it('sets year-2 LTCG to 12.5%', () => {
    const boss = getAnnualBoss(2);
    expect(boss.id).toBe('ltcg-hike');
    const next = applyBossEffect(startGame(DEFAULT_SETUP), boss.effect);
    expect(next.ltcgRate).toBe(0.125);
  });

  it('rotates year 4+ by (yearsPlayed - 4) % 6', () => {
    expect(getAnnualBoss(4).id).toBe('hike-6');
    expect(getAnnualBoss(6).id).toBe('diwali-boss');
    expect(getAnnualBoss(10).id).toBe('diwali-boss');
  });
});
```

`src/engine/ending.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { DEFAULT_SETUP } from './defaults';
import { evaluateEnding } from './ending';
import { startGame } from './state';

describe('evaluateEnding', () => {
  it('discounts after-tax value by 7% for 20 years', () => {
    const state = {
      ...startGame(DEFAULT_SETUP),
      yearsPlayed: 20,
      portfolioValue: 1_64_00_000,
      investedAmount: 72_00_000,
      ltcgRate: 0.125,
      cashBuffer: 12_000,
    };
    const ending = evaluateEnding(state);
    const gains = 1_64_00_000 - 72_00_000;
    const tax = gains * 0.125;
    const afterTax = 1_64_00_000 - tax;
    const real = afterTax / 1.07 ** 20;
    expect(ending.tax).toBe(tax);
    expect(ending.afterTax).toBe(afterTax);
    expect(ending.realPurchasingPower).toBe(real);
    expect(ending.cashLeft).toBe(12_000);
    expect(ending.result).toBe(real >= 40_00_000 ? 'win' : 'lose');
  });

  it('wins only when real >= target', () => {
    const rich = evaluateEnding({
      ...startGame({ ...DEFAULT_SETUP, targetCorpusToday: 1 }),
      yearsPlayed: 1,
      portfolioValue: 10_000,
      investedAmount: 10_000,
    });
    expect(rich.result).toBe('win');
    const poor = evaluateEnding({
      ...startGame({ ...DEFAULT_SETUP, targetCorpusToday: 10_00_000 }),
      yearsPlayed: 1,
      portfolioValue: 100,
      investedAmount: 100,
    });
    expect(poor.result).toBe('lose');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/engine/events.test.ts src/engine/bosses.test.ts src/engine/ending.test.ts`
Expected: FAIL cannot find module

- [ ] **Step 3: Write implementation**

`src/engine/events.ts` — array of 15 `{ id, title, copy, cost }` exactly from spec §9.1.

```ts
import type { PendingEvent, Rng } from './types';

export const LIFE_EVENTS: readonly PendingEvent[] = [
  { id: 'wedding', title: 'Destination wedding', copy: "Friend's destination wedding. You can't say no.", cost: 25_000 },
  { id: 'root-canal', title: 'Root canal', copy: 'Root canal. Insurance denied the claim.', cost: 15_000 },
  { id: 'brewery', title: 'Microbrewery', copy: 'Weekend at a microbrewery went out of hand.', cost: 8_000 },
  { id: 'car-sensor', title: 'Car service', copy: 'Car service and random sensor failure.', cost: 18_000 },
  { id: 'parents', title: "Parents' tests", copy: "Parents' full-body checkup. You are the wallet.", cost: 22_000 },
  { id: 'diwali', title: 'Diwali haul', copy: 'Diwali shopping. "Just this year."', cost: 12_000 },
  { id: 'iphone', title: 'Upgrade', copy: 'iPhone because the EMI is "only ₹4,000". You pay lump-sum anyway.', cost: 20_000 },
  { id: 'society', title: 'Maintenance', copy: 'Society maintenance arrears + sinking fund.', cost: 9_000 },
  { id: 'offsite', title: 'Optional offsite', copy: 'Office offsite. Optional, according to the email.', cost: 14_000 },
  { id: 'cousin', title: 'Shagun', copy: "Cousin's engagement. Envelope physics.", cost: 11_000 },
  { id: 'plumber', title: 'Tank + plumber', copy: 'Water tank cleaning plus a plumber who found "one more issue".', cost: 7_000 },
  { id: 'flight', title: 'Emergency flight', copy: 'Last-minute flight home. Dynamic pricing sends regards.', cost: 16_000 },
  { id: 'ca-fee', title: 'CA and advance tax', copy: 'CA fee plus an advance-tax surprise.', cost: 10_000 },
  { id: 'mba-fomo', title: 'Weekend MBA', copy: 'Online MBA ad. You enroll at 1 a.m.', cost: 25_000 },
  { id: 'swiggy', title: 'Subscriptions', copy: 'Swiggy + Hotstar + "I\'ll cancel later" finally catch up.', cost: 6_000 },
];

export function pickLifeEvent(rng: Rng): PendingEvent {
  const index = Math.min(LIFE_EVENTS.length - 1, Math.floor(rng() * LIFE_EVENTS.length));
  return LIFE_EVENTS[index]!;
}
```

`src/engine/bosses.ts`:

```ts
import type { BossEffect, GameState, PendingBoss } from './types';

const ROTATION: PendingBoss[] = [
  { id: 'hike-6', title: 'Breaking News: Increment', copy: 'Another increment. CTC hiked 6%. The treadmill speeds up.', effect: { type: 'salaryMul', factor: 1.06 } },
  { id: 'cpi-5', title: 'Breaking News: CPI', copy: 'Official CPI is 5%. Your kirana already knew.', effect: { type: 'expenseMul', factor: 1.05 } },
  { id: 'diwali-boss', title: 'Breaking News: Diwali', copy: 'Company Diwali gift is a thali. The bill is yours.', effect: { type: 'oneShotBill', amount: 15_000 } },
  { id: 'tax-news', title: 'Breaking News: Panel', copy: "Panel to 'study' capital gains. Markets shrug. You do not.", effect: { type: 'flavour' } },
  { id: 'fuel-rent', title: 'Breaking News: Fuel', copy: 'Petrol and society charges quietly moved in.', effect: { type: 'expenseAdd', amount: 1_500 } },
  { id: 'promo', title: 'Breaking News: Promotion', copy: 'Promoted. CTC hiked 10%. Inbox hiked 40%.', effect: { type: 'salaryMul', factor: 1.1 } },
];

export function getAnnualBoss(yearsPlayed: number): PendingBoss {
  if (yearsPlayed === 1) {
    return { id: 'hike-8', title: 'Breaking News: Appraisal', copy: 'Appraisal season. CTC hiked 8%. Stretch assignment attached.', effect: { type: 'salaryMul', factor: 1.08 } };
  }
  if (yearsPlayed === 2) {
    return { id: 'ltcg-hike', title: 'Breaking News: LTCG', copy: 'LTCG hiked to 12.5%. Indexation removed.', effect: { type: 'setLtcg', rate: 0.125 } };
  }
  if (yearsPlayed === 3) {
    return { id: 'rent-spike', title: 'Breaking News: Inflation', copy: 'Inflation spikes. Rent and the cook both want more.', effect: { type: 'expenseAdd', amount: 2_000 } };
  }
  return ROTATION[(yearsPlayed - 4) % 6]!;
}

export function applyBossEffect(state: GameState, effect: BossEffect): GameState {
  switch (effect.type) {
    case 'salaryMul':
      return { ...state, monthlySalary: Math.round(state.monthlySalary * effect.factor) };
    case 'expenseAdd':
      return { ...state, fixedExpenses: state.fixedExpenses + effect.amount };
    case 'expenseMul':
      return { ...state, fixedExpenses: Math.round(state.fixedExpenses * effect.factor) };
    case 'setLtcg':
      return { ...state, ltcgRate: effect.rate };
    case 'oneShotBill':
    case 'flavour':
      return state;
  }
}
```

`src/engine/ending.ts`:

```ts
import { INFLATION_RATE } from './defaults';
import type { Ending, GameState } from './types';

export function evaluateEnding(state: GameState): Ending {
  const gross = state.portfolioValue;
  const gains = Math.max(gross - state.investedAmount, 0);
  const tax = gains * state.ltcgRate;
  const afterTax = gross - tax;
  const real = afterTax / (1 + INFLATION_RATE) ** state.yearsPlayed;
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
    realPurchasingPower: real,
    targetCorpusToday: state.setup.targetCorpusToday,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/engine/events.test.ts src/engine/bosses.test.ts src/engine/ending.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/engine/events.ts src/engine/bosses.ts src/engine/ending.ts src/engine/events.test.ts src/engine/bosses.test.ts src/engine/ending.test.ts
git commit -m "feat: add life events, annual bosses, and end-game math"
```

---

### Task 5: Tick pipeline

**Files:**
- Create: `src/engine/tick.ts`, `src/engine/tick.test.ts`

**Interfaces:**
- Consumes: `applyPaycheck`, `payBill`, `applySip`, `compound`, `pickLifeEvent`, `getAnnualBoss`, `applyBossEffect`, `evaluateEnding`, `EVENT_CHANCE`, `pushLedger`
- Produces:
  - `beginMonth(state: GameState, rng: Rng): GameState`
  - `continueMonth(state: GameState): GameState`
  - `applyBossAndFinish(state: GameState): GameState`
  - `finishMonth(state: GameState): GameState`
  - `tick(state: GameState, rng: Rng): GameState` — no-op unless `phase === 'playing'`
  - `payPending(state: GameState): GameState` — event → `continueMonth`; boss → `applyBossAndFinish`; else no-op

Pipeline (do not invent a different order):

1. `beginMonth`: if `phase !== 'playing'` return state. Set `needsAnnualBoss = ageMonths === 0 && yearsPlayed > 0`. `applyPaycheck`. If ended, return. If `rng() < 0.30`, set `pendingEvent = pickLifeEvent(rng)`, `phase = 'awaitingEvent'`, return. Else return state still `playing`.
2. `tick`: if not playing, return. `after = beginMonth(...)`. If `after.phase !== 'playing'`, return `after`. Else `return continueMonth(after)`.
3. `continueMonth`: if `pendingEvent`, `payBill` then clear `pendingEvent`. If ended, return. `applySip` then `compound`. If `needsAnnualBoss`, set `pendingBoss = getAnnualBoss(yearsPlayed)`, `phase = 'awaitingBoss'`, return. Else `finishMonth`.
4. `applyBossAndFinish`: apply `applyBossEffect`. If `oneShotBill`, `payBill` with the boss copy. Ledger a `boss` line (amount 0 unless bill already logged). Clear `pendingBoss`, `needsAnnualBoss = false`. If ended, return. Else `finishMonth`.
5. `finishMonth`: if already ended, return. Increment `ageMonths`; if 12, set 0, `ageYears += 1`, `yearsPlayed += 1`. If `ageYears === setup.targetRetirementAge && ageMonths === 0`, set `ending = evaluateEnding`, `phase = 'ended'`, `isPaused = true`. Else `phase = 'playing'`.

- [ ] **Step 1: Write the failing tests**

`src/engine/tick.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { DEFAULT_SETUP } from './defaults';
import { startGame } from './state';
import { payPending, tick } from './tick';
import type { GameState, Rng } from './types';

const neverEvent: Rng = () => 0.99;
const alwaysEvent: Rng = () => 0.0;

function completeQuietMonth(state: GameState): GameState {
  let next = tick(state, neverEvent);
  if (next.phase === 'awaitingBoss' || next.phase === 'awaitingEvent') {
    next = payPending(next);
  }
  return next;
}

describe('tick', () => {
  it('is a no-op when not playing', () => {
    const setup = { ...startGame(DEFAULT_SETUP), phase: 'setup' as const };
    expect(tick(setup, alwaysEvent)).toEqual(setup);
  });

  it('schedules an event when rng < 0.30 and never when rng >= 0.30', () => {
    const opened = tick(startGame(DEFAULT_SETUP), alwaysEvent);
    expect(opened.phase).toBe('awaitingEvent');
    expect(opened.pendingEvent).not.toBeNull();
    const quiet = tick(startGame(DEFAULT_SETUP), neverEvent);
    expect(quiet.pendingEvent).toBeNull();
    expect(quiet.phase === 'playing' || quiet.phase === 'awaitingBoss').toBe(true);
  });

  it('is age 26y 0m and yearsPlayed 1 after 12 completed months', () => {
    let s = startGame(DEFAULT_SETUP);
    for (let i = 0; i < 12; i += 1) {
      s = completeQuietMonth(s);
    }
    expect(s.ageYears).toBe(26);
    expect(s.ageMonths).toBe(0);
    expect(s.yearsPlayed).toBe(1);
    expect(s.phase).toBe('playing');
  });

  it('ends after 240 completed default months with yearsPlayed 20', () => {
    let s = startGame(DEFAULT_SETUP);
    let guard = 0;
    while (s.phase !== 'ended' && guard < 800) {
      if (s.phase === 'playing') {
        s = tick(s, neverEvent);
      } else {
        s = payPending(s);
      }
      guard += 1;
    }
    expect(s.phase).toBe('ended');
    expect(s.yearsPlayed).toBe(20);
    expect(s.ending).not.toBeNull();
    expect(s.ending?.result === 'win' || s.ending?.result === 'lose').toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/engine/tick.test.ts`
Expected: FAIL cannot find module `./tick`

- [ ] **Step 3: Write `src/engine/tick.ts`**

```ts
import { applyBossEffect, getAnnualBoss } from './bosses';
import { EVENT_CHANCE } from './defaults';
import { applyPaycheck, applySip, compound, payBill } from './economy';
import { evaluateEnding } from './ending';
import { pickLifeEvent } from './events';
import { pushLedger } from './state';
import type { GameState, Rng } from './types';

export function beginMonth(state: GameState, rng: Rng): GameState {
  if (state.phase !== 'playing') {
    return state;
  }
  let next: GameState = {
    ...state,
    needsAnnualBoss: state.ageMonths === 0 && state.yearsPlayed > 0,
  };
  next = applyPaycheck(next);
  if (next.phase === 'ended') {
    return next;
  }
  if (rng() < EVENT_CHANCE) {
    return { ...next, pendingEvent: pickLifeEvent(rng), phase: 'awaitingEvent' };
  }
  return next;
}

export function finishMonth(state: GameState): GameState {
  if (state.phase === 'ended') {
    return state;
  }
  let ageMonths = state.ageMonths + 1;
  let { ageYears, yearsPlayed } = state;
  if (ageMonths === 12) {
    ageMonths = 0;
    ageYears += 1;
    yearsPlayed += 1;
  }
  const bumped = { ...state, ageMonths, ageYears, yearsPlayed, phase: 'playing' as const };
  if (ageYears === state.setup.targetRetirementAge && ageMonths === 0) {
    return {
      ...bumped,
      phase: 'ended',
      isPaused: true,
      ending: evaluateEnding(bumped),
    };
  }
  return bumped;
}

export function continueMonth(state: GameState): GameState {
  let next = state;
  if (next.pendingEvent) {
    const event = next.pendingEvent;
    next = payBill(next, event.cost, event.title);
    next = { ...next, pendingEvent: null };
    if (next.phase === 'ended') {
      return next;
    }
  }
  next = applySip(next);
  next = compound(next);
  if (next.needsAnnualBoss) {
    return {
      ...next,
      pendingBoss: getAnnualBoss(next.yearsPlayed),
      phase: 'awaitingBoss',
    };
  }
  return finishMonth(next);
}

export function applyBossAndFinish(state: GameState): GameState {
  const boss = state.pendingBoss;
  if (!boss) {
    return state;
  }
  let next = applyBossEffect(state, boss.effect);
  if (boss.effect.type === 'oneShotBill') {
    next = payBill(next, boss.effect.amount, boss.title);
  }
  next = pushLedger(
    { ...next, pendingBoss: null, needsAnnualBoss: false },
    'boss',
    boss.title,
    boss.effect.type === 'oneShotBill' ? -boss.effect.amount : 0,
  );
  if (next.phase === 'ended') {
    return next;
  }
  return finishMonth(next);
}

export function tick(state: GameState, rng: Rng): GameState {
  if (state.phase !== 'playing') {
    return state;
  }
  const after = beginMonth(state, rng);
  if (after.phase !== 'playing') {
    return after;
  }
  return continueMonth(after);
}

export function payPending(state: GameState): GameState {
  if (state.phase === 'awaitingEvent') {
    return continueMonth(state);
  }
  if (state.phase === 'awaitingBoss') {
    return applyBossAndFinish(state);
  }
  return state;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/engine/tick.test.ts`
Expected: PASS

Run: `npm test`
Expected: all engine tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/engine/tick.ts src/engine/tick.test.ts
git commit -m "feat: implement phased monthly tick and retirement check"
```

---

### Task 6: Zustand store

**Files:**
- Create: `src/store/gameStore.ts`, `src/store/gameStore.test.ts`

**Interfaces:**
- Consumes: `emptySetupState`, `startGame`, `resetToSetup`, `tick`, `payPending`, `validateSetup`
- Produces: `useGameStore` with state fields copied from `GameState` plus actions:
  - `startGame(setup: SetupConfig): boolean` — if `validateSetup` is empty, replace state with `engine.startGame(setup)` and return true; else leave state and return false
  - `tick(): void` — `set(tick(get(), Math.random))`
  - `payPending(): void`
  - `setSip(amount: number): void` — `plannedSip = Math.max(0, Math.round(amount))`
  - `setPaused(paused: boolean): void`
  - `setTickSpeed(speed: 1 | 2 | 4): void`
  - `resetToSetup(): void`

The store must not call `setInterval`.

- [ ] **Step 1: Write the failing test**

`src/store/gameStore.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_SETUP } from '../engine/defaults';
import { useGameStore } from './gameStore';

describe('useGameStore', () => {
  beforeEach(() => {
    useGameStore.setState(useGameStore.getInitialState());
  });

  it('starts in setup and refuses invalid config', () => {
    expect(useGameStore.getState().phase).toBe('setup');
    const ok = useGameStore.getState().startGame({ ...DEFAULT_SETUP, targetRetirementAge: 20 });
    expect(ok).toBe(false);
    expect(useGameStore.getState().phase).toBe('setup');
  });

  it('starts a run and no-ops tick after reset', () => {
    expect(useGameStore.getState().startGame(DEFAULT_SETUP)).toBe(true);
    expect(useGameStore.getState().phase).toBe('playing');
    useGameStore.getState().setSip(15_000);
    expect(useGameStore.getState().plannedSip).toBe(15_000);
    useGameStore.getState().resetToSetup();
    const before = useGameStore.getState();
    useGameStore.getState().tick();
    useGameStore.getState().payPending();
    expect(useGameStore.getState().phase).toBe('setup');
    expect(useGameStore.getState().ledger).toEqual(before.ledger);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/store/gameStore.test.ts`
Expected: FAIL cannot find module

- [ ] **Step 3: Write `src/store/gameStore.ts`**

```ts
import { create } from 'zustand';
import { emptySetupState, resetToSetup, startGame } from '../engine/state';
import { payPending, tick } from '../engine/tick';
import type { GameState, SetupConfig } from '../engine/types';
import { validateSetup } from '../engine/validate';

export type GameStore = GameState & {
  startGame: (setup: SetupConfig) => boolean;
  tick: () => void;
  payPending: () => void;
  setSip: (amount: number) => void;
  setPaused: (paused: boolean) => void;
  setTickSpeed: (speed: 1 | 2 | 4) => void;
  resetToSetup: () => void;
};

export const useGameStore = create<GameStore>((set, get) => ({
  ...emptySetupState(),
  startGame: (setup) => {
    if (validateSetup(setup).length > 0) {
      return false;
    }
    set(startGame(setup));
    return true;
  },
  tick: () => {
    set(tick(get(), Math.random));
  },
  payPending: () => {
    set(payPending(get()));
  },
  setSip: (amount) => {
    set({ plannedSip: Math.max(0, Math.round(amount)) });
  },
  setPaused: (paused) => {
    set({ isPaused: paused });
  },
  setTickSpeed: (speed) => {
    set({ tickSpeed: speed });
  },
  resetToSetup: () => {
    set(resetToSetup(get()));
  },
}));
```

Zustand `set` merges, so `set(startGame(setup))` replaces `GameState` fields and keeps the action functions.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/store/gameStore.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/store
git commit -m "feat: add Zustand store as a thin engine wrapper"
```

---

### Task 7: Setup screen, GameLoop, App shell

**Files:**
- Create: `src/ui/GameLoop.tsx`, `src/ui/SetupScreen.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `useGameStore`, `DEFAULT_SETUP`, `validateSetup`, `TICK_MS`, `formatInr`
- Produces: form that calls `startGame`; `GameLoop` that intervals `store.tick` via a ref

- [ ] **Step 1: Write a failing compile check by adding the imports in App**

Replace `src/App.tsx` with:

```tsx
import { GameLoop } from './ui/GameLoop';
import { SetupScreen } from './ui/SetupScreen';
import { useGameStore } from './store/gameStore';

export default function App() {
  const phase = useGameStore((s) => s.phase);
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <GameLoop />
      {phase === 'setup' ? <SetupScreen /> : <p className="p-6">Playing…</p>}
    </div>
  );
}
```

- [ ] **Step 2: Run typecheck to verify it fails**

Run: `npx tsc -b --pretty false`
Expected: FAIL cannot find `./ui/GameLoop` or `./ui/SetupScreen`

- [ ] **Step 3: Implement the UI files**

`src/ui/GameLoop.tsx`:

```tsx
import { useEffect, useRef } from 'react';
import { TICK_MS } from '../engine/defaults';
import { useGameStore } from '../store/gameStore';

export function GameLoop() {
  const phase = useGameStore((s) => s.phase);
  const isPaused = useGameStore((s) => s.isPaused);
  const tickSpeed = useGameStore((s) => s.tickSpeed);
  const tick = useGameStore((s) => s.tick);
  const tickRef = useRef(tick);
  tickRef.current = tick;

  useEffect(() => {
    if (phase !== 'playing' || isPaused) {
      return;
    }
    const id = window.setInterval(() => {
      tickRef.current();
    }, TICK_MS[tickSpeed]);
    return () => window.clearInterval(id);
  }, [phase, isPaused, tickSpeed]);

  return null;
}
```

`src/ui/SetupScreen.tsx`:

```tsx
import { useState } from 'react';
import { DEFAULT_SETUP } from '../engine/defaults';
import type { SetupConfig } from '../engine/types';
import { validateSetup } from '../engine/validate';
import { useGameStore } from '../store/gameStore';

function num(value: string): number {
  return Number(value);
}

export function SetupScreen() {
  const start = useGameStore((s) => s.startGame);
  const last = useGameStore((s) => s.setup);
  const [form, setForm] = useState<SetupConfig>(last.monthlySalary ? last : DEFAULT_SETUP);
  const [errors, setErrors] = useState<string[]>([]);

  function field<K extends keyof SetupConfig>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: num(value) }));
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const nextErrors = validateSetup(form);
    setErrors(nextErrors);
    if (nextErrors.length === 0) {
      start(form);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto flex max-w-xl flex-col gap-4 p-8">
      <h1 className="text-2xl font-semibold text-emerald-400">The Middle-Class Treadmill</h1>
      <p className="text-slate-400">Indian Tax Edition. Set the plan. Survive the months.</p>
      <label className="flex flex-col gap-1 text-sm">
        Starting age
        <input className="rounded bg-slate-800 p-2" type="number" value={form.startAgeYears} onChange={(e) => field('startAgeYears', e.target.value)} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Target retirement age
        <input className="rounded bg-slate-800 p-2" type="number" value={form.targetRetirementAge} onChange={(e) => field('targetRetirementAge', e.target.value)} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Monthly salary
        <input className="rounded bg-slate-800 p-2" type="number" value={form.monthlySalary} onChange={(e) => field('monthlySalary', e.target.value)} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Fixed expenses
        <input className="rounded bg-slate-800 p-2" type="number" value={form.fixedExpenses} onChange={(e) => field('fixedExpenses', e.target.value)} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Planned SIP
        <input className="rounded bg-slate-800 p-2" type="number" value={form.plannedSip} onChange={(e) => field('plannedSip', e.target.value)} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Target corpus (today&apos;s ₹)
        <input className="rounded bg-slate-800 p-2" type="number" value={form.targetCorpusToday} onChange={(e) => field('targetCorpusToday', e.target.value)} />
      </label>
      {errors.map((err) => (
        <p key={err} className="text-sm text-rose-500">{err}</p>
      ))}
      <button type="submit" className="rounded bg-emerald-500 px-4 py-2 font-medium text-slate-950">
        Start treadmill
      </button>
    </form>
  );
}
```

- [ ] **Step 4: Verify typecheck and tests**

Run: `npx tsc -b --pretty false`
Expected: exit 0

Run: `npm test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx src/ui/GameLoop.tsx src/ui/SetupScreen.tsx
git commit -m "feat: add setup form and interval game loop"
```

---

### Task 8: Classic HUD dashboard

**Files:**
- Create: `src/ui/AnimatedNumber.tsx`, `src/ui/BufferGauge.tsx`, `src/ui/LedgerFeed.tsx`, `src/ui/Dashboard.tsx`
- Modify: `src/App.tsx` — render `Dashboard` when `phase !== 'setup' && phase !== 'ended'`

**Interfaces:**
- Consumes: store fields + `formatInr`, `ageLabel`, `monthLabel`, `setSip`, `setPaused`, `setTickSpeed`
- Produces: top bar (month, age, animated emerald portfolio, pause, 1x/2x/4x), left salary/expense/SIP slider (0..salary, step 1000), right buffer tank, bottom ledger newest first

Buffer fill percent: `clamp(cashBuffer / monthlySalary, 0, 1)` so the tank has a stable scale.

- [ ] **Step 1: Point App at Dashboard so typecheck fails**

```tsx
import { Dashboard } from './ui/Dashboard';
import { EndReceipt } from './ui/EndReceipt';
import { EventModal } from './ui/EventModal';
import { GameLoop } from './ui/GameLoop';
import { SetupScreen } from './ui/SetupScreen';
import { useGameStore } from './store/gameStore';

export default function App() {
  const phase = useGameStore((s) => s.phase);
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <GameLoop />
      {phase === 'setup' && <SetupScreen />}
      {phase !== 'setup' && phase !== 'ended' && <Dashboard />}
      {(phase === 'awaitingEvent' || phase === 'awaitingBoss') && <EventModal />}
      {phase === 'ended' && <EndReceipt />}
    </div>
  );
}
```

- [ ] **Step 2: Run typecheck to verify it fails**

Run: `npx tsc -b --pretty false`
Expected: FAIL missing `Dashboard` / `EventModal` / `EndReceipt`

- [ ] **Step 3: Implement HUD components**

`src/ui/AnimatedNumber.tsx`:

```tsx
import { useEffect, useRef, useState } from 'react';
import { formatInr } from '../lib/formatInr';

export function AnimatedNumber({ value, className }: { value: number; className?: string }) {
  const [shown, setShown] = useState(value);
  const shownRef = useRef(shown);
  shownRef.current = shown;

  useEffect(() => {
    const from = shownRef.current;
    const started = performance.now();
    let raf = 0;
    const step = (now: number) => {
      const p = Math.min(1, (now - started) / 400);
      const next = Math.round(from + (value - from) * p);
      setShown(next);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  return <span className={className}>{formatInr(shown)}</span>;
}
```

`src/ui/BufferGauge.tsx`:

```tsx
import { formatInr } from '../lib/formatInr';

export function BufferGauge({ cash, salary }: { cash: number; salary: number }) {
  const fill = Math.max(0, Math.min(100, salary === 0 ? 0 : (cash / salary) * 100));
  return (
    <div className="flex h-full flex-col rounded-lg bg-slate-800 p-4">
      <p className="text-xs uppercase tracking-wide text-slate-400">Cash buffer</p>
      <div className="relative mt-4 min-h-[180px] flex-1 overflow-hidden rounded-md border border-slate-600">
        <div
          className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-sky-600 to-cyan-300"
          style={{ height: `${fill}%` }}
        />
      </div>
      <p className="mt-3 text-lg text-cyan-300">{formatInr(cash)} liquid</p>
    </div>
  );
}
```

`src/ui/LedgerFeed.tsx`:

```tsx
import { formatInr } from '../lib/formatInr';
import type { LedgerEntry } from '../engine/types';

export function LedgerFeed({ entries }: { entries: LedgerEntry[] }) {
  return (
    <div className="h-48 overflow-auto rounded-lg bg-slate-950 p-3 font-mono text-xs">
      {entries.map((row) => (
        <div key={row.id} className={row.amount < 0 ? 'text-rose-300' : 'text-emerald-300'}>
          <span className="text-slate-500">{row.monthLabel} · </span>
          {row.text}
          {row.amount !== 0 ? ` ${formatInr(row.amount)}` : ''}
        </div>
      ))}
    </div>
  );
}
```

`src/ui/Dashboard.tsx`:

```tsx
import { Pause, Play } from 'lucide-react';
import { ageLabel, monthLabel } from '../engine/calendar';
import { formatInr } from '../lib/formatInr';
import { useGameStore } from '../store/gameStore';
import { AnimatedNumber } from './AnimatedNumber';
import { BufferGauge } from './BufferGauge';
import { LedgerFeed } from './LedgerFeed';

export function Dashboard() {
  const ageYears = useGameStore((s) => s.ageYears);
  const ageMonths = useGameStore((s) => s.ageMonths);
  const yearsPlayed = useGameStore((s) => s.yearsPlayed);
  const portfolioValue = useGameStore((s) => s.portfolioValue);
  const monthlySalary = useGameStore((s) => s.monthlySalary);
  const fixedExpenses = useGameStore((s) => s.fixedExpenses);
  const plannedSip = useGameStore((s) => s.plannedSip);
  const cashBuffer = useGameStore((s) => s.cashBuffer);
  const isPaused = useGameStore((s) => s.isPaused);
  const tickSpeed = useGameStore((s) => s.tickSpeed);
  const ledger = useGameStore((s) => s.ledger);
  const setPaused = useGameStore((s) => s.setPaused);
  const setTickSpeed = useGameStore((s) => s.setTickSpeed);
  const setSip = useGameStore((s) => s.setSip);

  return (
    <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-4 p-6">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-700 pb-3">
        <p className="text-slate-300">
          {monthLabel(yearsPlayed, ageMonths)} · Age {ageLabel(ageYears, ageMonths)}
        </p>
        <AnimatedNumber value={portfolioValue} className="text-2xl font-semibold text-emerald-400" />
        <div className="flex items-center gap-2">
          <button type="button" className="rounded bg-slate-800 px-3 py-1" onClick={() => setPaused(!isPaused)}>
            {isPaused ? <Play size={16} /> : <Pause size={16} />}
          </button>
          {([1, 2, 4] as const).map((speed) => (
            <button
              key={speed}
              type="button"
              className={`rounded px-3 py-1 ${tickSpeed === speed ? 'bg-slate-600' : 'bg-slate-800'}`}
              onClick={() => setTickSpeed(speed)}
            >
              {speed}x
            </button>
          ))}
        </div>
      </header>
      <div className="grid flex-1 grid-cols-2 gap-4">
        <section className="rounded-lg bg-slate-800 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-400">Inflows / outflows</p>
          <p className="mt-3 text-emerald-400">Salary +{formatInr(monthlySalary)}</p>
          <p className="text-rose-500">Rent &amp; bills −{formatInr(fixedExpenses)}</p>
          <label className="mt-6 block text-sm text-slate-400">
            SIP next month · {formatInr(plannedSip)}
            <input
              className="mt-2 w-full"
              type="range"
              min={0}
              max={monthlySalary}
              step={1000}
              value={Math.min(plannedSip, monthlySalary)}
              onChange={(e) => setSip(Number(e.target.value))}
            />
          </label>
        </section>
        <BufferGauge cash={cashBuffer} salary={monthlySalary} />
      </div>
      <LedgerFeed entries={ledger} />
    </div>
  );
}
```

Use this App for Task 8 only (no EventModal / EndReceipt imports yet):

```tsx
{phase === 'setup' && <SetupScreen />}
{phase !== 'setup' && <Dashboard />}
```

Event/end overlays land in Task 9.

- [ ] **Step 4: Verify**

Run: `npx tsc -b --pretty false`
Expected: exit 0

Run: `npm test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx src/ui
git commit -m "feat: add classic HUD dashboard, buffer tank, and ledger"
```

---

### Task 9: Event/boss modal and end receipt

**Files:**
- Create: `src/ui/EventModal.tsx`, `src/ui/EndReceipt.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `pendingEvent`, `pendingBoss`, `payPending`, `ending`, `resetToSetup`, `formatInr`
- Produces: rose shaking modal that blocks ticks via `phase`; receipt lines Gross → LTCG → After tax → Inflation → Real vs target; cash footnote; **Play again**

- [ ] **Step 1: Point App at the overlays**

Replace `src/App.tsx` with:

```tsx
import { Dashboard } from './ui/Dashboard';
import { EndReceipt } from './ui/EndReceipt';
import { EventModal } from './ui/EventModal';
import { GameLoop } from './ui/GameLoop';
import { SetupScreen } from './ui/SetupScreen';
import { useGameStore } from './store/gameStore';

export default function App() {
  const phase = useGameStore((s) => s.phase);
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <GameLoop />
      {phase === 'setup' && <SetupScreen />}
      {phase !== 'setup' && phase !== 'ended' && <Dashboard />}
      {(phase === 'awaitingEvent' || phase === 'awaitingBoss') && <EventModal />}
      {phase === 'ended' && <EndReceipt />}
    </div>
  );
}
```

- [ ] **Step 2: Run typecheck to verify it fails**

Run: `npx tsc -b --pretty false`
Expected: FAIL cannot find `./ui/EventModal` or `./ui/EndReceipt`

- [ ] **Step 3: Implement modal and receipt**

`src/ui/EventModal.tsx`:

```tsx
import { formatInr } from '../lib/formatInr';
import { useGameStore } from '../store/gameStore';

export function EventModal() {
  const phase = useGameStore((s) => s.phase);
  const pendingEvent = useGameStore((s) => s.pendingEvent);
  const pendingBoss = useGameStore((s) => s.pendingBoss);
  const payPending = useGameStore((s) => s.payPending);

  const isEvent = phase === 'awaitingEvent' && pendingEvent;
  const isBoss = phase === 'awaitingBoss' && pendingBoss;
  if (!isEvent && !isBoss) {
    return null;
  }

  const title = isEvent ? pendingEvent.title : pendingBoss.title;
  const copy = isEvent ? pendingEvent.copy : pendingBoss.copy;
  const bill = isEvent
    ? pendingEvent.cost
    : pendingBoss.effect.type === 'oneShotBill'
      ? pendingBoss.effect.amount
      : 0;
  const action = bill > 0 ? `Pay ${formatInr(bill)}` : 'Continue';

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-slate-950/70 p-4">
      <div className="w-full max-w-md animate-shake rounded-lg border border-rose-500 bg-slate-900 p-6">
        <p className="bg-rose-500 px-3 py-1 text-sm font-semibold uppercase tracking-wide text-white">
          {isBoss ? 'Breaking News' : 'Life happens'}
        </p>
        <h2 className="mt-4 text-xl font-semibold">{title}</h2>
        <p className="mt-2 text-slate-300">{copy}</p>
        <button
          type="button"
          className="mt-6 w-full rounded bg-rose-500 px-4 py-2 font-medium text-white"
          onClick={payPending}
        >
          {action}
        </button>
      </div>
    </div>
  );
}
```

`src/ui/EndReceipt.tsx`:

```tsx
import { formatInr } from '../lib/formatInr';
import { useGameStore } from '../store/gameStore';

export function EndReceipt() {
  const ending = useGameStore((s) => s.ending);
  const reset = useGameStore((s) => s.resetToSetup);
  if (!ending) {
    return null;
  }

  const headline =
    ending.result === 'win'
      ? 'You made it. On paper.'
      : ending.result === 'bankrupt'
        ? 'Portfolio: ₹0. Treadmill wins.'
        : 'Retirement day. The corpus blinked first.';

  return (
    <div className="mx-auto max-w-lg p-8">
      <h1 className="text-2xl font-semibold text-rose-400">{headline}</h1>
      <dl className="mt-6 space-y-2 font-mono text-sm">
        <div className="flex justify-between">
          <dt>Gross portfolio</dt>
          <dd className="text-emerald-400">{formatInr(ending.grossPortfolio)}</dd>
        </div>
        <div className="flex justify-between">
          <dt>LTCG @ {(ending.ltcgRate * 100).toFixed(1)}%</dt>
          <dd className="text-rose-400">−{formatInr(ending.tax)}</dd>
        </div>
        <div className="flex justify-between">
          <dt>After tax</dt>
          <dd>{formatInr(ending.afterTax)}</dd>
        </div>
        <div className="flex justify-between">
          <dt>Inflation 7% × {ending.yearsPlayed} years</dt>
          <dd className="text-rose-400">{formatInr(ending.realPurchasingPower)}</dd>
        </div>
        <div className="flex justify-between border-t border-slate-700 pt-2">
          <dt>Real rupees vs target</dt>
          <dd>
            {formatInr(ending.realPurchasingPower)} / {formatInr(ending.targetCorpusToday)}
          </dd>
        </div>
      </dl>
      <p className="mt-4 text-sm text-slate-500">
        Cash left in the buffer (not counted): {formatInr(ending.cashLeft)}
      </p>
      <button type="button" className="mt-8 rounded bg-emerald-500 px-4 py-2 text-slate-950" onClick={reset}>
        Play again
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Verify build and tests**

Run: `npx tsc -b --pretty false`
Expected: exit 0

Run: `npm test`
Expected: PASS

Run: `npm run build`
Expected: Vite build succeeds

Manual smoke (required before calling the task done): `npm run dev`, start with defaults, pause, change speed, move SIP, Pay one event, confirm ledger + buffer update. 4x is enough to prove the loop; do not require sitting through 240 months.

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx src/ui/EventModal.tsx src/ui/EndReceipt.tsx
git commit -m "feat: add event modal and brutal FIRE receipt"
```

---

## Self-review (plan vs spec)

**Spec coverage**

| Spec section | Task |
|---|---|
| Stack / file tree | 1 |
| Types, defaults, calendar, startGame, ledger cap | 2 |
| Setup validation | 2 + 7 |
| Paycheck carryover, STCG, SIP partial/skip, bankrupt | 3 |
| 15 events, annual bosses, ending math | 4 |
| Phased tick, pause-via-phase, 12/240 month clocks | 5 |
| Zustand thin wrapper, no interval in store | 6 |
| Setup form, GameLoop refs + TICK_MS | 7 |
| Classic HUD, buffer, ledger, live SIP, pause/speed | 8 |
| Event/boss modal, receipt, play again | 9 |
| Constraints (no leftover sweep, no SIP liquidation) | 3 + 5 |

**Type names locked:** `beginMonth`, `continueMonth`, `applyBossAndFinish`, `finishMonth`, `tick`, `payPending`, `startGame`, `resetToSetup`, `validateSetup`, `formatInr`, `calendarMonth`, `calendarYear`, `liquidate`, `payBill`, `applySip`, `LIFE_EVENTS`, `pickLifeEvent`, `getAnnualBoss`, `applyBossEffect`, `evaluateEnding`, `useGameStore`.

**Not in v1 (correctly omitted):** save/load, backend, RTL, debug skip-to-end, Web Worker.
