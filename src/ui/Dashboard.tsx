import { Pause, Play } from 'lucide-react';
import { ageLabel, monthLabel } from '../engine/calendar';
import { payableCarTiers, payableHouseTiers } from '../engine/choices';
import { emergencyTarget, liveNetWorth } from '../engine/netWorth';
import { formatInr } from '../lib/formatInr';
import { useGameStore } from '../store/gameStore';
import { AnimatedNumber } from './AnimatedNumber';
import { EmiCard } from './EmiCard';
import { FdCard } from './FdCard';
import { LedgerFeed } from './LedgerFeed';
import { ThemeToggle } from './ThemeToggle';

function InvestmentCard({ value }: { value: number }) {
  return (
    <section className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
      <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Investments</p>
      <p className="mt-2 text-xl font-semibold text-[var(--money)]">{formatInr(value)}</p>
      <p className="text-xs text-[var(--muted)]">Market value · returns vary monthly</p>
    </section>
  );
}

export function Dashboard() {
  const ageYears = useGameStore((s) => s.ageYears);
  const ageMonths = useGameStore((s) => s.ageMonths);
  const yearsPlayed = useGameStore((s) => s.yearsPlayed);
  const portfolioValue = useGameStore((s) => s.portfolioValue);
  const netWorth = useGameStore(liveNetWorth);
  const target = useGameStore(emergencyTarget);
  const canOpenHouse = useGameStore(
    (s) => !s.house && payableHouseTiers(s).length > 0,
  );
  const canOpenCar = useGameStore(
    (s) => !s.ownedCar && payableCarTiers(s).length > 0,
  );
  const monthlySalary = useGameStore((s) => s.monthlySalary);
  const livingExpenses = useGameStore((s) => s.livingExpenses);
  const rent = useGameStore((s) => s.rent);
  const plannedSip = useGameStore((s) => s.plannedSip);
  const cashBuffer = useGameStore((s) => s.cashBuffer);
  const isPaused = useGameStore((s) => s.isPaused);
  const tickSpeed = useGameStore((s) => s.tickSpeed);
  const ledger = useGameStore((s) => s.ledger);
  const loans = useGameStore((s) => s.loans);
  const setPaused = useGameStore((s) => s.setPaused);
  const setTickSpeed = useGameStore((s) => s.setTickSpeed);
  const setSip = useGameStore((s) => s.setSip);
  const openChoice = useGameStore((s) => s.openChoice);
  const transferToMarket = useGameStore((s) => s.transferToMarket);

  return (
    <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-4 p-4 sm:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] pb-3">
        <p className="text-[var(--muted)]">
          {monthLabel(yearsPlayed, ageMonths)} · Age {ageLabel(ageYears, ageMonths)}
        </p>
        <div className="text-right">
          <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Net worth</p>
          <AnimatedNumber value={netWorth} className="text-2xl font-semibold text-[var(--money)]" />
          <p className="text-xs text-[var(--muted)]">Portfolio {formatInr(portfolioValue)}</p>
        </div>
        <div className="flex w-full items-center justify-end gap-2 sm:w-auto">
          <ThemeToggle />
          <button
            type="button"
            className="min-h-11 rounded border border-[var(--border)] bg-[var(--card)] px-3"
            aria-label={isPaused ? 'Resume' : 'Pause'}
            onClick={() => setPaused(!isPaused)}
          >
            {isPaused ? <Play size={16} /> : <Pause size={16} />}
          </button>
          {([1, 2, 4] as const).map((speed) => (
            <button
              key={speed}
              type="button"
              className={`min-h-11 rounded border border-[var(--border)] px-3 ${
                tickSpeed === speed ? 'bg-[var(--money)] text-[var(--app-bg)]' : 'bg-[var(--card)]'
              }`}
              onClick={() => setTickSpeed(speed)}
            >
              {speed}x
            </button>
          ))}
        </div>
      </header>
      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
          <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Inflows / outflows</p>
          <p className="mt-3 text-[var(--money)]">Salary +{formatInr(monthlySalary)}</p>
          <p className="text-[var(--expense)]">Living −{formatInr(livingExpenses)}</p>
          {rent > 0 ? (
            <p className="text-[var(--expense)]">Rent −{formatInr(rent)}</p>
          ) : (
            <p className="text-[var(--muted)]">Rent: owned</p>
          )}
          <label className="mt-6 block text-sm text-[var(--muted)]">
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
          {canOpenHouse && (
            <button
              type="button"
              className="mt-4 min-h-11 w-full rounded bg-amber-500 px-3 font-medium text-[var(--app-bg)] sm:w-auto"
              onClick={() => openChoice('house')}
            >
              House
            </button>
          )}
          {canOpenCar && (
            <button
              type="button"
              className="mt-4 min-h-11 w-full rounded bg-amber-500 px-3 font-medium text-[var(--app-bg)] sm:ml-2 sm:w-auto"
              onClick={() => openChoice('car')}
            >
              Car
            </button>
          )}
        </div>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
          <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Cash</p>
          <p className={`mt-2 text-2xl font-semibold ${cashBuffer < target ? 'text-amber-400' : 'text-[var(--money)]'}`}>
            {formatInr(cashBuffer)}
          </p>
          <p className="text-xs text-[var(--muted)]">Liquid FD balance</p>
        </div>
      </section>
      <div className="hidden gap-4 md:grid md:grid-cols-3">
        <InvestmentCard value={portfolioValue} />
        <EmiCard loans={loans} />
        <FdCard cash={cashBuffer} target={target} onTransfer={transferToMarket} />
      </div>
      <details className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 md:hidden">
        <summary className="cursor-pointer text-sm font-medium">Details</summary>
        <div className="mt-4 grid gap-4">
          <InvestmentCard value={portfolioValue} />
          <EmiCard loans={loans} />
          <FdCard cash={cashBuffer} target={target} onTransfer={transferToMarket} />
          <LedgerFeed entries={ledger} />
        </div>
      </details>
      <div className="hidden md:block">
        <LedgerFeed entries={ledger} />
      </div>
    </div>
  );
}
