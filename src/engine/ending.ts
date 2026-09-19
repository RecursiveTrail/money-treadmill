import { INFLATION_RATE } from './defaults';
import type { Ending, GameState } from './types';

export function evaluateEnding(state: GameState): Ending {
  const gross = state.portfolioValue;
  const gains = Math.max(gross - state.investedAmount, 0);
  const tax = gains * state.ltcgRate;
  const afterTax = gross - tax;
  const real = afterTax / (1 + INFLATION_RATE) ** state.yearsPlayed;
  const result = real >= state.setup.targetCorpusToday ? 'win' : 'lose';
  return {
    result,
    yearsPlayed: state.yearsPlayed,
    grossPortfolio: gross,
    investedAmount: state.investedAmount,
    ltcgRate: state.ltcgRate,
    tax,
    afterTax,
    cashLeft: state.cashBuffer,
    realPurchasingPower: real,
    targetCorpusToday: state.setup.targetCorpusToday,
  };
}
