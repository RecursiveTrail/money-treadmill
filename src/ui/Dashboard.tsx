import { Pause, Play } from 'lucide-react';
import { ageLabel, monthLabel } from '../engine/calendar';
import { payableHouseTiers } from '../engine/choices';
import { liveNetWorth } from '../engine/netWorth';
import { formatInr } from '../lib/formatInr';
import { useGameStore } from '../store/gameStore';
import { AnimatedNumber } from './AnimatedNumber';
import { BufferGauge } from './BufferGauge';
import { LedgerFeed } from './LedgerFeed';

export function Dashboard() {
  const ageYears = useGameStore((s) => s.ageYears);
  const ageMonths = useGameStore((s) => s.ageMonths);
  const yearsPlayed = useGameStore((s) => s.yearsPlayed);
  const portfolioValue = useGameStore((s) => s.portfolioValue);
  const netWorth = useGameStore(liveNetWorth);
  const canOpenHouse = useGameStore(
    (s) => !s.house && payableHouseTiers(s).length > 0,
  );
  const monthlySalary = useGameStore((s) => s.monthlySalary);
  const livingExpenses = useGameStore((s) => s.livingExpenses);
  const rent = useGameStore((s) => s.rent);
  const plannedSip = useGameStore((s) => s.plannedSip);
  const cashBuffer = useGameStore((s) => s.cashBuffer);
  const isPaused = useGameStore((s) => s.isPaused);
  const tickSpeed = useGameStore((s) => s.tickSpeed);
  const ledger = useGameStore((s) => s.ledger);
  const setPaused = useGameStore((s) => s.setPaused);
  const setTickSpeed = useGameStore((s) => s.setTickSpeed);
  const setSip = useGameStore((s) => s.setSip);
  const openChoice = useGameStore((s) => s.openChoice);

  return (
    <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-4 p-6">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-700 pb-3">
        <p className="text-slate-300">
          {monthLabel(yearsPlayed, ageMonths)} · Age {ageLabel(ageYears, ageMonths)}
        </p>
        <div className="text-center">
          <p className="text-xs uppercase tracking-wide text-slate-400">Net worth</p>
          <AnimatedNumber value={netWorth} className="text-2xl font-semibold text-emerald-400" />
          <p className="text-xs text-slate-400">Portfolio {formatInr(portfolioValue)}</p>
        </div>
        <div className="flex items-center gap-2">
          {canOpenHouse && (
            <button
              type="button"
              className="rounded bg-amber-500 px-3 py-1 font-medium text-slate-950"
              onClick={() => openChoice('house')}
            >
              House
            </button>
          )}
          <button
            type="button"
            className="rounded bg-slate-800 px-3 py-1"
            aria-label={isPaused ? 'Resume' : 'Pause'}
            onClick={() => setPaused(!isPaused)}
          >
            {isPaused ? <Play size={16} /> : <Pause size={16} />}
          </button>
          {([1, 2, 4] as const).map((speed) => (
            <button
              key={speed}
              type="button"
              className={`rounded px-3 py-1 ${tickSpeed === speed ? 'bg-slate-600' : 'bg-slate-800'}`}
              onClick={() => setTickSpeed(speed)}
            >
              {speed}x
            </button>
          ))}
        </div>
      </header>
      <div className="grid flex-1 grid-cols-2 gap-4">
        <section className="rounded-lg bg-slate-800 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-400">Inflows / outflows</p>
          <p className="mt-3 text-emerald-400">Salary +{formatInr(monthlySalary)}</p>
          <p className="text-[var(--expense)]">Living −{formatInr(livingExpenses)}</p>
          {rent > 0 ? (
            <p className="text-[var(--expense)]">Rent −{formatInr(rent)}</p>
          ) : (
            <p className="text-[var(--muted)]">Rent: owned</p>
          )}
          <label className="mt-6 block text-sm text-slate-400">
            SIP next month · {formatInr(plannedSip)}
            <input
              className="mt-2 w-full"
              type="range"
              min={0}
              max={monthlySalary}
              step={1000}
              value={Math.min(plannedSip, monthlySalary)}
              onChange={(e) => setSip(Number(e.target.value))}
            />
          </label>
        </section>
        <BufferGauge cash={cashBuffer} salary={monthlySalary} />
      </div>
      <LedgerFeed entries={ledger} />
    </div>
  );
}
