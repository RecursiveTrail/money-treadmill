import { formatInr } from '../lib/formatInr';
import { useGameStore } from '../store/gameStore';

export function EventModal() {
  const phase = useGameStore((s) => s.phase);
  const pendingEvent = useGameStore((s) => s.pendingEvent);
  const pendingBoss = useGameStore((s) => s.pendingBoss);
  const payPending = useGameStore((s) => s.payPending);

  const isEvent = phase === 'awaitingEvent' && pendingEvent;
  const isBoss = phase === 'awaitingBoss' && pendingBoss;
  if (!isEvent && !isBoss) {
    return null;
  }

  let title: string;
  let copy: string;
  let bill: number;
  if (isEvent) {
    const event = pendingEvent;
    if (!event) {
      return null;
    }
    title = event.title;
    copy = event.copy;
    bill = event.cost;
  } else {
    const boss = pendingBoss;
    if (!boss) {
      return null;
    }
    title = boss.title;
    copy = boss.copy;
    bill = boss.effect.type === 'oneShotBill' ? boss.effect.amount : 0;
  }
  const action = bill > 0 ? `Pay ${formatInr(bill)}` : 'Continue';

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-[var(--scrim)] p-4">
      <div className="w-full max-w-md animate-shake rounded-lg border border-[var(--expense)] bg-[var(--modal)] p-6">
        <p className="bg-[var(--expense)] px-3 py-1 text-sm font-semibold uppercase tracking-wide text-[var(--modal)]">
          {isBoss ? 'Breaking News' : 'Life happens'}
        </p>
        <h2 className="mt-4 text-xl font-semibold">{title}</h2>
        <p className="mt-2 text-[var(--muted)]">{copy}</p>
        <button
          type="button"
          className="mt-6 w-full rounded bg-[var(--expense)] px-4 py-2 font-medium text-[var(--modal)]"
          onClick={payPending}
        >
          {action}
        </button>
      </div>
    </div>
  );
}
