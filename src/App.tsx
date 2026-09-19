import { ChoiceModal } from './ui/ChoiceModal';
import { Dashboard } from './ui/Dashboard';
import { EndReceipt } from './ui/EndReceipt';
import { EventModal } from './ui/EventModal';
import { GameLoop } from './ui/GameLoop';
import { SetupScreen } from './ui/SetupScreen';
import { useGameStore } from './store/gameStore';

export default function App() {
  const phase = useGameStore((s) => s.phase);
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <GameLoop />
      {phase === 'setup' && <SetupScreen />}
      {phase !== 'setup' && phase !== 'ended' && <Dashboard />}
      {(phase === 'awaitingEvent' || phase === 'awaitingBoss') && <EventModal />}
      {phase === 'awaitingChoice' && <ChoiceModal />}
      {phase === 'ended' && <EndReceipt />}
    </div>
  );
}
