import { homePrincipal } from './loans';
import type { GameState } from './types';

export function homeEquity(state: GameState): number {
  if (!state.house) {
    return 0;
  }
  return Math.max(state.house.currentValue - homePrincipal(state.loans), 0);
}

export function liveNetWorth(state: GameState): number {
  return state.portfolioValue + state.cashBuffer + homeEquity(state);
}

export function emergencyTarget(state: GameState): number {
  const emiTotal = state.loans.reduce((sum, loan) => sum + loan.emi, 0);
  return 12 * (state.livingExpenses + state.rent + emiTotal);
}
