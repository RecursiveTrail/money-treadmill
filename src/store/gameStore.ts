import { create } from 'zustand';
import { emptySetupState, resetToSetup, startGame as startGameFromSetup } from '../engine/state';
import { payPending, tick } from '../engine/tick';
import type { GameState, SetupConfig } from '../engine/types';
import { validateSetup } from '../engine/validate';

export type GameStore = GameState & {
  startGame: (setup: SetupConfig) => boolean;
  tick: () => void;
  payPending: () => void;
  setSip: (amount: number) => void;
  setPaused: (paused: boolean) => void;
  setTickSpeed: (speed: 1 | 2 | 4) => void;
  resetToSetup: () => void;
};

export const useGameStore = create<GameStore>((set, get) => ({
  ...emptySetupState(),
  startGame: (setup) => {
    if (validateSetup(setup).length > 0) {
      return false;
    }
    set(startGameFromSetup(setup));
    return true;
  },
  tick: () => {
    set(tick(get(), Math.random));
  },
  payPending: () => {
    set(payPending(get()));
  },
  setSip: (amount) => {
    set({ plannedSip: Math.max(0, Math.round(amount)) });
  },
  setPaused: (paused) => {
    set({ isPaused: paused });
  },
  setTickSpeed: (speed) => {
    set({ tickSpeed: speed });
  },
  resetToSetup: () => {
    set(resetToSetup(get()));
  },
}));
