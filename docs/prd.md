# Project Requirements Document (PRD)

**Project Name:** The Middle-Class Treadmill (Indian Tax Edition)
**Target Platform:** Web (React / TypeScript / Tailwind CSS)
**Purpose:** An interactive, satirical idle/RNG game for a YouTube coding video on the Recursive Trail channel.

## 1. Core Concept & Gameplay Loop

The game is a satirical financial simulation of a 25-year-old middle-class Indian employee trying to reach Financial Independence and Retire Early (FIRE).

* **Time System:** The game operates on a tick-based system. 1 Tick = 1 In-Game Month = 2 Real-Time Seconds.
* **The Loop:** Every month, a salary is credited, fixed expenses are immediately deducted, and remaining funds are held in a "Buffer".
* **The Catch (RNG):** Random life events trigger during the month, eating into the Buffer.
* **Investment Phase:** At the end of the month, any money left in the Buffer goes into a compounded Investment Portfolio. If the Buffer is negative, investments must be liquidated (triggering a 20% STCG tax penalty).
* **End Goal:** Reach the Target Retirement Age and Corpus, only to face the "Final Boss" (LTCG and Inflation).

## 2. Technical Stack

* **Framework:** React (Vite or Next.js)
* **Language:** TypeScript (Strict mode)
* **Styling:** Tailwind CSS (for rapid, clean UI development)
* **Icons:** `lucide-react`
* **State Management:** React `zustand` (Mandatory for the core game engine to prevent race conditions during the tick loop) and `useEffect` for the game loop interval.

## 3. Global State Architecture (The `zustand` Store)

//need to plan

## 4. Key Mechanics & Algorithms

### A. The Monthly Tick Logic (Fires every 2000ms)

1. **Age Increment:** `currentAgeMonths` + 1. If 12, increment `currentAgeYears`.
2. **Income Drop:** Set `currentBuffer` to `monthlySalary` - `fixedExpenses`.
3. **RNG Event Roll:** 30% chance to trigger a random event from the `EVENT_POOL`. If triggered, pause the game (`isPaused = true`) until the user clicks "Pay".
4. **SIP Execution:** Subtract `plannedSIP` from `currentBuffer`. Add `plannedSIP` to `investedAmount` and `portfolioValue`.
5. **Compounding:** Apply monthly interest to `portfolioValue` (e.g., assuming 12% annual = 1% monthly). `portfolioValue *= 1.01`.

### B. The RNG Event Pool (`EVENT_POOL`)

Create an array of objects to pull from when an event triggers:

* *Wedding:* "Friend's Destination Wedding. You can't say no." (Cost: ₹25,000)
* *Medical:* "Root canal. Insurance denied the claim." (Cost: ₹15,000)
* *Lifestyle:* "Weekend at a microbrewery went out of hand." (Cost: ₹8,000)
* *Vehicle:* "Car service and random sensor failure." (Cost: ₹18,000)

### C. The Emergency Liquidation Logic

If an RNG event costs *more* than the `currentBuffer`:

1. Calculate the deficit: `Deficit = EventCost - currentBuffer`
2. Deduct `Deficit` from `portfolioValue`.
3. Apply STCG Penalty: Deduct an additional `Deficit * 0.20` from `portfolioValue` as a "Tax Penalty".
4. Add a red log to the ledger: "Liquidated Portfolio: -₹[X] (Includes 20% STCG)".

### D. The Boss Events (Annual Budget)

When `currentAgeMonths` hits 12 (every year in July):

* Trigger a mandatory "Breaking News" Boss Event.
* *Year 2:* "LTCG hiked to 12.5%. Indexation removed." (Aesthetic warning, increases final tax multiplier).
* *Year 3:* "Inflation spikes! Rent increases by 10%." (Increase `fixedExpenses` by ₹2,000).

### E. The End Game Calculation (Game Over Screen)

When `currentAgeYears === targetRetirementAge`:

1. Calculate **Gross Value**: `portfolioValue`.
2. Calculate **Tax**: Subtract 12.5% on the gains (`portfolioValue - investedAmount`).
3. Calculate **Inflation Impact**: Discount the final value by 7% compounded annually over the years played to show "Real Purchasing Power".
4. Display a brutal receipt showing the user that their ₹5 Crores is effectively worth ₹1.5 Crores in today's money.

## 5. UI/UX & Component Hierarchy

* **`<GameWrapper/>`**: Holds the `useReducer` context and the `setInterval` loop.
* **`<SetupScreen/>`**: Initial form to set Age and Target Corpus.
* **`<Dashboard/>`**:
* *Top Bar:* Current Age, Portfolio Value (Animated counter in Green), Current Month.
* *Middle Split:*
* Left: Salary & Fixed Outflows (Static layout).
* Right: `currentBuffer` gauge (Liquid filling/draining).




* **`<EventModal/>`**: Absolute positioned modal with a Red header and a shaking animation. Blocks the game loop until dismissed.
* **`<LedgerFeed/>`**: A scrolling terminal-like window at the bottom showing history (e.g., "+₹1,00,000 Salary Credited", "-₹25,000 Goa Trip").

## 6. Cursor Implementation Instructions (For the AI)

* *Instruction 1:* Begin by scaffolding the Types and the `useReducer` store.
* *Instruction 2:* Implement the `useEffect` interval logic strictly using functional state updates or refs to avoid stale closures.
* *Instruction 3:* Build the UI using clean, modern Tailwind utility classes. Use a dark mode theme (slate-900 background, emerald-400 for money, rose-500 for expenses).

---

**How to use this:** Copy everything above this line, open a fresh Cursor workspace, hit `Ctrl+I` or open the Composer, and paste this entire PRD. Cursor will have enough context to generate the boilerplate, the complex reducer, and the game loop in one go.