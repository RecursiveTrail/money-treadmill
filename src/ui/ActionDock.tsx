import { formatInr } from '../lib/formatInr';
import { useGameStore } from '../store/gameStore';

export function ActionDock() {
  const phase = useGameStore((s) => s.phase);
  const pendingEvent = useGameStore((s) => s.pendingEvent);
  const pendingBoss = useGameStore((s) => s.pendingBoss);
  const pendingChoice = useGameStore((s) => s.pendingChoice);
  const payPending = useGameStore((s) => s.payPending);
  const resolveChoice = useGameStore((s) => s.resolveChoice);
  const openChoicePicker = useGameStore((s) => s.openChoicePicker);

  if (phase === 'awaitingEvent' && pendingEvent) {
    return (
      <section aria-live="polite" className="rounded-lg border border-[var(--expense)] bg-[var(--card)] p-4">
        <p className="text-xs uppercase tracking-wide text-[var(--expense)]">Life happens</p>
        <h2 className="mt-2 text-lg font-semibold">{pendingEvent.title}</h2>
        <p className="mt-1 text-[var(--muted)]">{pendingEvent.copy}</p>
        <button
          type="button"
          className="mt-4 min-h-11 w-full rounded bg-[var(--expense)] px-4 py-2 font-medium text-[var(--modal)] sm:w-auto"
          onClick={payPending}
        >
          Pay {formatInr(pendingEvent.cost)}
        </button>
      </section>
    );
  }

  if (phase === 'awaitingBoss' && pendingBoss) {
    const bill = pendingBoss.effect.type === 'oneShotBill' ? pendingBoss.effect.amount : 0;
    return (
      <section aria-live="polite" className="rounded-lg border border-[var(--expense)] bg-[var(--card)] p-4">
        <p className="text-xs uppercase tracking-wide text-[var(--expense)]">Breaking News</p>
        <h2 className="mt-2 text-lg font-semibold">{pendingBoss.title}</h2>
        <p className="mt-1 text-[var(--muted)]">{pendingBoss.copy}</p>
        <button
          type="button"
          className="mt-4 min-h-11 w-full rounded bg-[var(--expense)] px-4 py-2 font-medium text-[var(--modal)] sm:w-auto"
          onClick={payPending}
        >
          {bill > 0 ? `Pay ${formatInr(bill)}` : 'Continue'}
        </button>
      </section>
    );
  }

  if (phase !== 'awaitingChoice' || !pendingChoice) {
    return null;
  }

  if (pendingChoice.kind === 'taunt') {
    return (
      <section aria-live="polite" className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
        <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Family WhatsApp</p>
        <h2 className="mt-2 text-lg font-semibold">{pendingChoice.title}</h2>
        <p className="mt-1 whitespace-pre-line text-[var(--muted)]">{pendingChoice.copy}</p>
        <button
          type="button"
          className="mt-4 min-h-11 w-full rounded bg-[var(--money)] px-4 py-2 font-medium text-[var(--modal)] sm:w-auto"
          onClick={() => resolveChoice({ action: 'dismiss' })}
        >
          Continue
        </button>
      </section>
    );
  }

  if (pendingChoice.kind === 'kid') {
    return (
      <section aria-live="polite" className="rounded-lg border border-[var(--money)] bg-[var(--card)] p-4">
        <p className="text-xs uppercase tracking-wide text-[var(--money)]">Life choice</p>
        <h2 className="mt-2 text-lg font-semibold">{pendingChoice.title}</h2>
        <p className="mt-1 text-[var(--muted)]">{pendingChoice.copy}</p>
        <p className="mt-2 text-sm text-[var(--muted)]">Birth cost · {formatInr(pendingChoice.birthCost)}</p>
        <button
          type="button"
          className="mt-4 min-h-11 w-full rounded bg-[var(--money)] px-4 py-2 font-medium text-[var(--modal)] sm:w-auto"
          onClick={() => resolveChoice({ action: 'accept' })}
        >
          Yes, bacche
        </button>
        <button
          type="button"
          className="mt-3 min-h-11 w-full rounded bg-[var(--btn)] px-4 py-2 font-medium sm:ml-2 sm:w-auto"
          onClick={() => resolveChoice({ action: 'dismiss' })}
        >
          Not yet
        </button>
      </section>
    );
  }

  const declineLabel =
    pendingChoice.kind === 'house' ? 'Keep renting' : 'Not yet';

  return (
    <section aria-live="polite" className="rounded-lg border border-[var(--money)] bg-[var(--card)] p-4">
      <p className="text-xs uppercase tracking-wide text-[var(--money)]">Life choice</p>
      <h2 className="mt-2 text-lg font-semibold">{pendingChoice.title}</h2>
      <p className="mt-1 text-[var(--muted)]">{pendingChoice.copy}</p>
      <button
        type="button"
        className="mt-4 min-h-11 w-full rounded bg-[var(--money)] px-4 py-2 font-medium text-[var(--modal)] sm:w-auto"
        onClick={openChoicePicker}
      >
        Choose
      </button>
      <button
        type="button"
        className="mt-3 min-h-11 w-full rounded bg-[var(--btn)] px-4 py-2 font-medium sm:ml-2 sm:w-auto"
        onClick={() => resolveChoice({ action: 'dismiss' })}
      >
        {declineLabel}
      </button>
    </section>
  );
}
