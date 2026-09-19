import { INFLATION_RATE } from './defaults';
import { homeEquity } from './netWorth';
import type { Ending, GameState } from './types';

export function evaluateEnding(state: GameState): Ending {
  const gross = state.portfolioValue;
  const gains = Math.max(gross - state.investedAmount, 0);
  const tax = Math.round(gains * state.ltcgRate);
  const afterTax = Math.round(gross - tax);
  const equity = homeEquity(state);
  const netWorth = afterTax + state.cashBuffer + equity;
  const real = Math.round(netWorth / (1 + INFLATION_RATE) ** state.yearsPlayed);
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
    homeEquity: equity,
    netWorth,
    realPurchasingPower: real,
    targetCorpusToday: state.setup.targetCorpusToday,
  };
}
