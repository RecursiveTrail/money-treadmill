import { create } from 'zustand';
import { openChoice as openChoiceEngine } from '../engine/choices';
import { sipCap, transferToMarket as transferToMarketEngine } from '../engine/economy';
import { emptySetupState, resetToSetup, startGame as startGameFromSetup } from '../engine/state';
import { payPending, resolveChoice, tick } from '../engine/tick';
import type { ChoiceInput, ChoiceKind, GameState, SetupConfig } from '../engine/types';
import { validateSetup } from '../engine/validate';

export type GameStore = GameState & {
  startGame: (setup: SetupConfig) => boolean;
  tick: () => void;
  payPending: () => void;
  resolveChoice: (input: ChoiceInput) => void;
  openChoice: (kind: ChoiceKind) => void;
  openChoicePicker: () => void;
  closeChoicePicker: () => void;
  setSip: (amount: number) => void;
  transferToMarket: (amount: number) => void;
  setPaused: (paused: boolean) => void;
  setTickSpeed: (speed: 1 | 2 | 4) => void;
  resetToSetup: () => void;
  choicePickerOpen: boolean;
};

function pickerKind(kind: ChoiceKind | undefined): boolean {
  return kind === 'house' || kind === 'car' || kind === 'marriage';
}

export const useGameStore = create<GameStore>((set, get) => ({
  ...emptySetupState(),
  choicePickerOpen: false,
  startGame: (setup) => {
    if (validateSetup(setup).length > 0) {
      return false;
    }
    set({ ...startGameFromSetup(setup), choicePickerOpen: false });
    return true;
  },
  tick: () => {
    set({ ...tick(get(), Math.random), choicePickerOpen: false });
  },
  payPending: () => {
    set({ ...payPending(get(), Math.random), choicePickerOpen: false });
  },
  resolveChoice: (input) => {
    set({ ...resolveChoice(get(), input, Math.random), choicePickerOpen: false });
  },
  openChoice: (kind) => {
    const next = openChoiceEngine(get(), kind);
    set({
      ...next,
      choicePickerOpen: next.phase === 'awaitingChoice' && pickerKind(next.pendingChoice?.kind),
    });
  },
  openChoicePicker: () => {
    const s = get();
    if (s.phase !== 'awaitingChoice' || !pickerKind(s.pendingChoice?.kind)) {
      return;
    }
    set({ choicePickerOpen: true });
  },
  closeChoicePicker: () => {
    set({ choicePickerOpen: false });
  },
  setSip: (amount) => {
    const planned = Math.max(0, Math.round(amount));
    set({ plannedSip: Math.min(planned, sipCap(get())) });
  },
  transferToMarket: (amount) => {
    set(transferToMarketEngine(get(), amount));
  },
  setPaused: (paused) => {
    set({ isPaused: paused });
  },
  setTickSpeed: (speed) => {
    set({ tickSpeed: speed });
  },
  resetToSetup: () => {
    set({ ...resetToSetup(get()), choicePickerOpen: false });
  },
}));
