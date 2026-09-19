import type { GameState, PendingBoss } from './types';

const ROTATION: PendingBoss[] = [
  { id: 'hike-6', title: 'Breaking News: Increment', copy: 'Another increment. CTC hiked 6%. The treadmill speeds up.', effect: { type: 'salaryMul', factor: 1.06 } },
  { id: 'cpi-5', title: 'Breaking News: CPI', copy: 'Official CPI is 5%. Your kirana already knew.', effect: { type: 'expenseMul', factor: 1.05 } },
  { id: 'diwali-boss', title: 'Breaking News: Diwali', copy: 'Company Diwali gift is a thali. The bill is yours.', effect: { type: 'oneShotBill', amount: 15_000 } },
  { id: 'tax-news', title: 'Breaking News: Panel', copy: "Panel to 'study' capital gains. Markets shrug. You do not.", effect: { type: 'flavour' } },
  { id: 'fuel-rent', title: 'Breaking News: Fuel', copy: 'Petrol and society charges quietly moved in.', effect: { type: 'expenseAdd', amount: 1_500 } },
  { id: 'promo', title: 'Breaking News: Promotion', copy: 'Promoted. CTC hiked 10%. Inbox hiked 40%.', effect: { type: 'salaryMul', factor: 1.1 } },
];

export function getAnnualBoss(yearsPlayed: number): PendingBoss {
  if (yearsPlayed < 1) {
    throw new Error(`getAnnualBoss requires yearsPlayed >= 1, got ${yearsPlayed}`);
  }
  if (yearsPlayed === 1) {
    return { id: 'hike-8', title: 'Breaking News: Appraisal', copy: 'Appraisal season. CTC hiked 8%. Stretch assignment attached.', effect: { type: 'salaryMul', factor: 1.08 } };
  }
  if (yearsPlayed === 2) {
    return { id: 'ltcg-hike', title: 'Breaking News: LTCG', copy: 'LTCG hiked to 12.5%. Indexation removed.', effect: { type: 'setLtcg', rate: 0.125 } };
  }
  if (yearsPlayed === 3) {
    return { id: 'rent-spike', title: 'Breaking News: Inflation', copy: 'Inflation spikes. Rent and the cook both want more.', effect: { type: 'expenseAdd', amount: 2_000 } };
  }
  return ROTATION[(yearsPlayed - 4) % 6]!;
}

export function applyBossEffect(state: GameState, boss: PendingBoss): GameState {
  const effect = boss.effect;
  switch (effect.type) {
    case 'salaryMul':
      return { ...state, monthlySalary: Math.round(state.monthlySalary * effect.factor) };
    case 'expenseAdd': {
      if (boss.id === 'rent-spike' && state.rent > 0) {
        return { ...state, rent: state.rent + effect.amount };
      }
      return { ...state, livingExpenses: state.livingExpenses + effect.amount };
    }
    case 'expenseMul':
      return {
        ...state,
        livingExpenses: Math.round(state.livingExpenses * effect.factor),
        rent: state.rent > 0 ? Math.round(state.rent * effect.factor) : 0,
      };
    case 'setLtcg':
      return { ...state, ltcgRate: effect.rate };
    case 'oneShotBill':
    case 'flavour':
      return state;
  }
}
