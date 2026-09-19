import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_SETUP } from '../engine/defaults';
import { useGameStore } from './gameStore';

describe('useGameStore', () => {
  beforeEach(() => {
    useGameStore.setState(useGameStore.getInitialState());
  });

  it('starts in setup and refuses invalid config', () => {
    expect(useGameStore.getState().phase).toBe('setup');
    const ok = useGameStore.getState().startGame({ ...DEFAULT_SETUP, targetRetirementAge: 20 });
    expect(ok).toBe(false);
    expect(useGameStore.getState().phase).toBe('setup');
  });

  it('starts a run and no-ops tick after reset', () => {
    expect(useGameStore.getState().startGame(DEFAULT_SETUP)).toBe(true);
    expect(useGameStore.getState().phase).toBe('playing');
    useGameStore.getState().setSip(15_000);
    expect(useGameStore.getState().plannedSip).toBe(15_000);
    useGameStore.getState().resetToSetup();
    const before = useGameStore.getState();
    useGameStore.getState().tick();
    useGameStore.getState().payPending();
    expect(useGameStore.getState().phase).toBe('setup');
    expect(useGameStore.getState().ledger).toEqual(before.ledger);
  });

  it('transfers FD cash to the market', () => {
    expect(useGameStore.getState().startGame(DEFAULT_SETUP)).toBe(true);
    useGameStore.setState({ cashBuffer: 20_000, portfolioValue: 10_000, investedAmount: 10_000 });

    useGameStore.getState().transferToMarket(15_000);

    expect(useGameStore.getState().cashBuffer).toBe(5_000);
    expect(useGameStore.getState().portfolioValue).toBe(25_000);
    expect(useGameStore.getState().investedAmount).toBe(25_000);
  });
});
