import { FD_ANNUAL_RATE, HOUSE_ANNUAL_APPRECIATION } from './defaults';
import type { GameState, Rng } from './types';

export function equityFactor(rng: Rng): number {
  return 1 + 0.01 + 0.04 * (rng() - 0.5);
}

export function applyReturns(state: GameState, rng: Rng): GameState {
  const portfolioValue = Math.round(state.portfolioValue * equityFactor(rng));
  const cashBuffer = Math.round(state.cashBuffer * (1 + FD_ANNUAL_RATE) ** (1 / 12));
  const house = state.house
    ? {
        ...state.house,
        currentValue: Math.round(
          state.house.currentValue * (1 + HOUSE_ANNUAL_APPRECIATION) ** (1 / 12),
        ),
      }
    : null;

  return { ...state, portfolioValue, cashBuffer, house };
}
