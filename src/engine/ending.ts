import { INFLATION_RATE } from './defaults';
import type { Ending, GameState } from './types';

export function evaluateEnding(state: GameState): Ending {
  const gross = state.portfolioValue;
  const gains = Math.max(gross - state.investedAmount, 0);
  const tax = Math.round(gains * state.ltcgRate);
  const afterTax = Math.round(gross - tax);
  const real = Math.round(afterTax / (1 + INFLATION_RATE) ** state.yearsPlayed);
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
    homeEquity: 0,
    netWorth: afterTax,
    realPurchasingPower: real,
    targetCorpusToday: state.setup.targetCorpusToday,
  };
}
