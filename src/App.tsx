import { ChoiceModal } from './ui/ChoiceModal';
import { Dashboard } from './ui/Dashboard';
import { EndReceipt } from './ui/EndReceipt';
import { GameLoop } from './ui/GameLoop';
import { SetupScreen } from './ui/SetupScreen';
import { useGameStore } from './store/gameStore';

export default function App() {
  const phase = useGameStore((s) => s.phase);
  const choicePickerOpen = useGameStore((s) => s.choicePickerOpen);
  return (
    <div className="min-h-screen bg-[var(--app-bg)] text-[var(--app-fg)]">
      <GameLoop />
      {phase === 'setup' && <SetupScreen />}
      {phase !== 'setup' && phase !== 'ended' && <Dashboard />}
      {choicePickerOpen && <ChoiceModal />}
      {phase === 'ended' && <EndReceipt />}
    </div>
  );
}
