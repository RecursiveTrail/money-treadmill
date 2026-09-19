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
