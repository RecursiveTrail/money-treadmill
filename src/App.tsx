import { GameLoop } from './ui/GameLoop';
import { SetupScreen } from './ui/SetupScreen';
import { useGameStore } from './store/gameStore';

export default function App() {
  const phase = useGameStore((s) => s.phase);
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <GameLoop />
      {phase === 'setup' ? <SetupScreen /> : <p className="p-6">Playing…</p>}
    </div>
  );
}
