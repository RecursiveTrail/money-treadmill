# Agent notes

Before changing this repo, read **`docs/PROJECT.md`**.

That file is the operational map: layers, tick order, money rules, file paths, theme, tests, and known pitfalls. The v1 design spec is `docs/superpowers/specs/2026-09-18-middle-class-treadmill-design.md`. The live optional house/car/marriage/kid and net-worth HUD rules are in `docs/superpowers/specs/2026-09-19-optional-life-commitments-design.md`; that file wins where it disagrees with v1. If spec and `docs/PROJECT.md` disagree after a change, follow the spec and update `docs/PROJECT.md` in the same change.

Hard constraints (also in PROJECT.md):

- Money and phase logic stay in `src/engine/`. Zustand only wraps it. React must not tick the calendar.
- Do not reset cash each month. Do not auto-invest leftover buffer. Do not liquidate to fund SIP.
- `ageMonths === 0` is July. Age increments after SIP/boss. Retirement July is not played.
- Integer rupees after multiply. Dark theme is the default.
- Vitest must ignore `**/._*` (exFAT AppleDouble files).
