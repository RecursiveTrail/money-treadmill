import type { Loan } from '../engine/types';
import { formatInr } from '../lib/formatInr';

export function EmiCard({ loans }: { loans: Loan[] }) {
  return (
    <section className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
      <p className="text-xs uppercase tracking-wide text-[var(--muted)]">EMIs</p>
      {loans.length === 0 ? (
        <p className="mt-3 text-sm text-[var(--muted)]">No EMIs. Relatives have notices.</p>
      ) : (
        <div className="mt-3 space-y-3">
          {loans.map((loan, index) => (
            <p key={`${loan.kind}-${index}`} className="text-sm">
              <span className="capitalize">{loan.kind}</span> EMI {formatInr(loan.emi)} ·{' '}
              {loan.monthsRemaining}m left · {formatInr(loan.principalRemaining)}
            </p>
          ))}
        </div>
      )}
    </section>
  );
}
