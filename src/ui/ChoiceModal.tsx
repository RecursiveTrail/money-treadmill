import { HOME_ANNUAL_RATE, HOME_YEARS } from '../engine/defaults';
import { HOUSE_TIERS } from '../engine/choices';
import { downPayment, emi } from '../engine/loans';
import { formatInr } from '../lib/formatInr';
import { useGameStore } from '../store/gameStore';

export function ChoiceModal() {
  const pendingChoice = useGameStore((s) => s.pendingChoice);
  const resolveChoice = useGameStore((s) => s.resolveChoice);

  if (pendingChoice?.kind !== 'house') {
    return null;
  }

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-slate-950/70 md:p-4">
      <div className="h-full w-full max-w-md overflow-y-auto border-amber-500 bg-slate-900 p-6 md:h-auto md:rounded-lg md:border">
        <p className="bg-amber-500 px-3 py-1 text-sm font-semibold uppercase tracking-wide text-slate-950">
          Life choice
        </p>
        <h2 className="mt-4 text-xl font-semibold">{pendingChoice.title}</h2>
        <p className="mt-2 text-slate-300">{pendingChoice.copy}</p>
        <div className="mt-6 space-y-3">
          {HOUSE_TIERS.map((tier) => {
            const down = downPayment(tier.price);
            const monthlyEmi = emi(tier.price - down, HOME_ANNUAL_RATE, HOME_YEARS);
            const payable = pendingChoice.payableTierIds.includes(tier.id);
            return (
              <div key={tier.id} className="rounded border border-slate-700 p-4">
                <div className="grid gap-3">
                  <div>
                    <h3 className="font-semibold">{tier.label}</h3>
                    <p className="text-sm text-slate-400">Price {formatInr(tier.price)}</p>
                    <p className="text-sm text-slate-400">
                      Down {formatInr(down)} · EMI {formatInr(monthlyEmi)}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="min-h-11 w-full rounded bg-amber-500 px-3 py-2 font-medium text-slate-950 disabled:cursor-not-allowed disabled:opacity-40"
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
          className="mt-6 min-h-11 w-full rounded bg-slate-700 px-4 py-2 font-medium text-white"
          onClick={() => resolveChoice({ action: 'dismiss' })}
        >
          Keep renting
        </button>
      </div>
    </div>
  );
}
