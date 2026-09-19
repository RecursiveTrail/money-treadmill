import type { LedgerEntry } from '../engine/types';
import { ledgerLine } from './ledgerText';

export function LedgerFeed({ entries }: { entries: LedgerEntry[] }) {
  return (
    <div className="h-48 overflow-auto rounded-lg bg-slate-950 p-3 font-mono text-xs">
      {entries.map((row) => (
        <div key={row.id} className={row.amount < 0 ? 'text-rose-300' : 'text-emerald-300'}>
          <span className="text-slate-500">{row.monthLabel} · </span>
          {ledgerLine(row.text, row.amount)}
        </div>
      ))}
    </div>
  );
}
