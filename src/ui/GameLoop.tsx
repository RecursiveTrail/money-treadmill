import { useEffect, useRef } from 'react';
import { TICK_MS } from '../engine/defaults';
import { useGameStore } from '../store/gameStore';

export function GameLoop() {
  const phase = useGameStore((s) => s.phase);
  const isPaused = useGameStore((s) => s.isPaused);
  const tickSpeed = useGameStore((s) => s.tickSpeed);
  const tick = useGameStore((s) => s.tick);
  const tickRef = useRef(tick);
  tickRef.current = tick;

  useEffect(() => {
    if (phase !== 'playing' || isPaused) {
      return;
    }
    const id = window.setInterval(() => {
      tickRef.current();
    }, TICK_MS[tickSpeed]);
    return () => window.clearInterval(id);
  }, [phase, isPaused, tickSpeed]);

  return null;
}
