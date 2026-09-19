import { formatInr } from '../lib/formatInr';

export function BufferGauge({ cash, target }: { cash: number; target: number }) {
  const fill = Math.max(0, Math.min(100, target === 0 ? 100 : (cash / target) * 100));
  return (
    <div>
      <div className="relative mt-3 h-3 overflow-hidden rounded-full border border-[var(--border)]">
        <div
          className="absolute inset-y-0 left-0 bg-[var(--money)]"
          style={{ width: `${fill}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-[var(--muted)]">
        {formatInr(cash)} of {formatInr(target)} · 12× expenses
      </p>
    </div>
  );
}
