import { formatInr } from '../lib/formatInr';
import { useGameStore } from '../store/gameStore';
import { ThemeToggle } from './ThemeToggle';

export function EndReceipt() {
  const ending = useGameStore((s) => s.ending);
  const house = useGameStore((s) => s.house);
  const ownedCar = useGameStore((s) => s.ownedCar);
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
      <div className="flex items-start justify-between gap-4">
        <h1 className="text-2xl font-semibold text-[var(--expense)]">{headline}</h1>
        <ThemeToggle />
      </div>
      <dl className="mt-6 space-y-2 font-mono text-sm">
        <div className="flex justify-between">
          <dt>Gross portfolio</dt>
          <dd className="text-[var(--money)]">{formatInr(ending.grossPortfolio)}</dd>
        </div>
        <div className="flex justify-between">
          <dt>LTCG @ {(ending.ltcgRate * 100).toFixed(1)}%</dt>
          <dd className="text-[var(--expense)]">−{formatInr(ending.tax)}</dd>
        </div>
        <div className="flex justify-between">
          <dt>After tax</dt>
          <dd>{formatInr(ending.afterTax)}</dd>
        </div>
        <div className="flex justify-between">
          <dt>Cash</dt>
          <dd>{formatInr(ending.cashLeft)}</dd>
        </div>
        <div className="flex justify-between">
          <dt>{house ? 'Home equity' : 'Rented'}</dt>
          <dd>{house ? formatInr(ending.homeEquity) : '—'}</dd>
        </div>
        <div className="flex justify-between">
          <dt>Net worth</dt>
          <dd className="text-[var(--money)]">{formatInr(ending.netWorth)}</dd>
        </div>
        <div className="flex justify-between">
          <dt>Inflation 7% × {ending.yearsPlayed} years</dt>
          <dd className="text-[var(--expense)]">{formatInr(ending.realPurchasingPower)}</dd>
        </div>
        <div className="flex justify-between border-t border-[var(--border)] pt-2">
          <dt>Real rupees vs target</dt>
          <dd>
            {formatInr(ending.realPurchasingPower)} / {formatInr(ending.targetCorpusToday)}
          </dd>
        </div>
      </dl>
      {ownedCar && <p className="mt-3 text-sm text-[var(--muted)]">Car does not count.</p>}
      <button type="button" className="mt-8 rounded bg-[var(--money)] px-4 py-2 text-[var(--modal)]" onClick={reset}>
        Play again
      </button>
    </div>
  );
}
