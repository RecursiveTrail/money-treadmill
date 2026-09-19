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
