import { useId, useState } from 'react';
import { formatInr } from '../lib/formatInr';
import { BufferGauge } from './BufferGauge';

type FdCardProps = {
  cash: number;
  target: number;
  onTransfer: (amount: number) => void;
};

export function FdCard({ cash, target, onTransfer }: FdCardProps) {
  const transferId = useId();
  const [amount, setAmount] = useState('');
  const belowTarget = cash < target;

  function transfer() {
    onTransfer(Number(amount));
    setAmount('');
  }

  return (
    <section className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
      <p className="text-xs uppercase tracking-wide text-[var(--muted)]">FD / cash</p>
      <p className={`mt-2 text-xl font-semibold ${belowTarget ? 'text-amber-400' : 'text-[var(--money)]'}`}>
        {formatInr(cash)}
      </p>
      <p className="text-xs text-[var(--muted)]">FD ~5%</p>
      <BufferGauge cash={cash} target={target} />
      <div className="mt-4 grid gap-2">
        <label className="text-xs text-[var(--muted)]" htmlFor={transferId}>
          Amount to move
        </label>
        <input
          id={transferId}
          className="min-h-11 w-full rounded border border-[var(--border)] bg-[var(--app-bg)] px-3"
          type="number"
          min={0}
          step={1000}
          inputMode="numeric"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
        />
        <button
          type="button"
          className="min-h-11 w-full rounded bg-[var(--money)] px-3 font-medium text-[var(--app-bg)]"
          onClick={transfer}
        >
          Shift to market
        </button>
      </div>
    </section>
  );
}
