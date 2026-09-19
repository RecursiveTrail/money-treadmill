import type { LedgerEntry } from '../engine/types';
import { ledgerLine } from './ledgerText';

export function LedgerFeed({ entries }: { entries: LedgerEntry[] }) {
  return (
    <div className="h-48 overflow-auto rounded-lg bg-[var(--ledger)] p-3 font-mono text-xs">
      {entries.map((row) => (
        <div key={row.id} className={row.amount < 0 ? 'text-[var(--ledger-neg)]' : 'text-[var(--ledger-pos)]'}>
          <span className="text-[var(--muted)]">{row.monthLabel} · </span>
          {ledgerLine(row.text, row.amount)}
        </div>
      ))}
    </div>
  );
}
