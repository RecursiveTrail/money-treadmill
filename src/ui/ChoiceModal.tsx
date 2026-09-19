import { useState } from 'react';
import { CAR_TIERS, HOUSE_TIERS } from '../engine/choices';
import {
  CAR_ANNUAL_RATE,
  CAR_YEARS,
  HOME_ANNUAL_RATE,
  HOME_YEARS,
  STCG_RATE,
  WEDDING_RECOMMENDED,
} from '../engine/defaults';
import { downPayment, emi } from '../engine/loans';
import { formatInr } from '../lib/formatInr';
import { useGameStore } from '../store/gameStore';

export function ChoiceModal() {
  const pendingChoice = useGameStore((s) => s.pendingChoice);
  const cashBuffer = useGameStore((s) => s.cashBuffer);
  const resolveChoice = useGameStore((s) => s.resolveChoice);
  const closeChoicePicker = useGameStore((s) => s.closeChoicePicker);
  const [weddingSpend, setWeddingSpend] = useState(WEDDING_RECOMMENDED);

  if (!pendingChoice) {
    return null;
  }

  if (pendingChoice.kind === 'kid' || pendingChoice.kind === 'taunt') {
    return null;
  }

  if (pendingChoice.kind === 'marriage') {
    return (
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
          <p className="bg-[var(--money)] px-3 py-1 text-sm font-semibold uppercase tracking-wide text-[var(--modal)]">
            Life choice
          </p>
          <h2 className="mt-4 text-xl font-semibold">{pendingChoice.title}</h2>
          <p className="mt-2 text-[var(--muted)]">{pendingChoice.copy}</p>
          <label className="mt-6 block text-sm text-[var(--muted)]">
            Wedding spend · {formatInr(weddingSpend)}
            <input
              className="mt-3 w-full"
              type="range"
              min={pendingChoice.minSpend}
              max={pendingChoice.maxSpend}
              step={pendingChoice.step}
              value={weddingSpend}
              onChange={(event) => setWeddingSpend(Number(event.target.value))}
            />
          </label>
          <button
            type="button"
            className="mt-3 rounded-full border border-[var(--money)] px-3 py-1 text-sm text-[var(--money)]"
            onClick={() => setWeddingSpend(pendingChoice.recommended)}
          >
            Recommended · {formatInr(pendingChoice.recommended)}
          </button>
          <button
            type="button"
            className="mt-6 min-h-11 w-full rounded bg-[var(--money)] px-4 py-2 font-medium text-[var(--modal)]"
            onClick={() => resolveChoice({ action: 'accept', spend: weddingSpend })}
          >
            Get married
          </button>
          <button
            type="button"
            className="mt-3 min-h-11 w-full rounded bg-[var(--btn)] px-4 py-2 font-medium text-[var(--app-fg)]"
            onClick={() => resolveChoice({ action: 'dismiss' })}
          >
            Not yet
          </button>
        </div>
      </div>
    );
  }

  const isHouse = pendingChoice.kind === 'house';
  const tiers = isHouse ? HOUSE_TIERS : CAR_TIERS;
  const annualRate = isHouse ? HOME_ANNUAL_RATE : CAR_ANNUAL_RATE;
  const years = isHouse ? HOME_YEARS : CAR_YEARS;

  return (
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
        <p className="bg-[var(--money)] px-3 py-1 text-sm font-semibold uppercase tracking-wide text-[var(--modal)]">
          Life choice
        </p>
        <h2 className="mt-4 text-xl font-semibold">{pendingChoice.title}</h2>
        <p className="mt-2 text-[var(--muted)]">{pendingChoice.copy}</p>
        <div className="mt-6 space-y-3">
          {tiers.map((tier) => {
            const down = downPayment(tier.price);
            const monthlyEmi = emi(tier.price - down, annualRate, years);
            const payable = pendingChoice.payableTierIds.some((id) => id === tier.id);
            const amountNeeded = Math.round(
              Math.max(down - cashBuffer, 0) * (1 + STCG_RATE),
            );
            return (
              <div key={tier.id} className="rounded border border-[var(--border)] p-4">
                <div className="grid gap-3">
                  <div>
                    <h3 className="font-semibold">{tier.label}</h3>
                    <p className="text-sm text-[var(--muted)]">Price {formatInr(tier.price)}</p>
                    <p className="text-sm text-[var(--muted)]">
                      Down {formatInr(down)} · EMI {formatInr(monthlyEmi)}
                    </p>
                    {!payable && (
                      <p className="mt-1 text-xs text-[var(--expense)]">
                        need {formatInr(amountNeeded)} more (incl. STCG)
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    className="min-h-11 w-full rounded bg-[var(--money)] px-3 py-2 font-medium text-[var(--modal)] disabled:cursor-not-allowed disabled:opacity-40"
                    disabled={!payable}
                    onClick={() => resolveChoice({ action: 'accept', tierId: tier.id })}
                  >
                    Buy
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        <button
          type="button"
          className="mt-6 min-h-11 w-full rounded bg-[var(--btn)] px-4 py-2 font-medium text-[var(--app-fg)]"
          onClick={() => resolveChoice({ action: 'dismiss' })}
        >
          {isHouse ? 'Keep renting' : 'Not now'}
        </button>
      </div>
    </div>
  );
}
