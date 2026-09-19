import { useState } from 'react';
import { DEFAULT_SETUP } from '../engine/defaults';
import type { SetupConfig } from '../engine/types';
import { validateSetup } from '../engine/validate';
import { useGameStore } from '../store/gameStore';
import { ThemeToggle } from './ThemeToggle';

function num(value: string): number {
  return Number(value);
}

export function SetupScreen() {
  const start = useGameStore((s) => s.startGame);
  const last = useGameStore((s) => s.setup);
  const [form, setForm] = useState<SetupConfig>(last.monthlySalary ? last : DEFAULT_SETUP);
  const [errors, setErrors] = useState<string[]>([]);
  const inputClass =
    'w-full rounded border border-[var(--border)] bg-[var(--input)] p-2 text-[var(--app-fg)]';

  function field<K extends keyof SetupConfig>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: num(value) }));
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const nextErrors = validateSetup(form);
    setErrors(nextErrors);
    if (nextErrors.length === 0) {
      start(form);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto flex max-w-xl flex-col gap-4 p-8">
      <div className="flex items-start justify-between gap-4">
        <h1 className="text-2xl font-semibold text-[var(--money)]">The Middle-Class Treadmill</h1>
        <ThemeToggle />
      </div>
      <p className="text-[var(--muted)]">Indian Tax Edition. Set the plan. Survive the months.</p>
      <label className="flex flex-col gap-1 text-sm">
        Starting age
        <input className={inputClass} type="number" value={form.startAgeYears} onChange={(e) => field('startAgeYears', e.target.value)} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Target retirement age
        <input className={inputClass} type="number" value={form.targetRetirementAge} onChange={(e) => field('targetRetirementAge', e.target.value)} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Monthly salary
        <input className={inputClass} type="number" value={form.monthlySalary} onChange={(e) => field('monthlySalary', e.target.value)} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Fixed expenses
        <input className={inputClass} type="number" value={form.fixedExpenses} onChange={(e) => field('fixedExpenses', e.target.value)} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Planned SIP
        <input className={inputClass} type="number" value={form.plannedSip} onChange={(e) => field('plannedSip', e.target.value)} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Target corpus (today&apos;s ₹)
        <input className={inputClass} type="number" value={form.targetCorpusToday} onChange={(e) => field('targetCorpusToday', e.target.value)} />
      </label>
      {errors.map((err) => (
        <p key={err} className="text-sm text-[var(--expense)]">{err}</p>
      ))}
      <button type="submit" className="min-h-11 w-full rounded bg-[var(--money)] px-4 py-2 font-medium text-[var(--modal)]">
        Start treadmill
      </button>
    </form>
  );
}
