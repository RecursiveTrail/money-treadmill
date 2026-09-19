import { HOME_ANNUAL_RATE, HOME_YEARS } from './defaults';
import { payBill } from './economy';
import { canAffordDownPayment, downPayment, originateLoan } from './loans';
import { pushLedger } from './state';
import type { ChoiceInput, ChoiceKind, GameState, HouseTierId } from './types';

export const HOUSE_TIERS = [
  { id: 'bhk2' as const, label: '2 BHK', price: 80_00_000 },
  { id: 'bhk3' as const, label: '3 BHK', price: 1_10_00_000 },
  { id: 'premium' as const, label: 'Premium 3 BHK', price: 1_60_00_000 },
];

export function payableHouseTiers(state: GameState): HouseTierId[] {
  return HOUSE_TIERS.filter((tier) =>
    canAffordDownPayment(state.cashBuffer, state.portfolioValue, tier.price),
  ).map((tier) => tier.id);
}

function housePending(state: GameState): GameState {
  const payableTierIds = payableHouseTiers(state);
  if (payableTierIds.length === 0) {
    return state;
  }
  return {
    ...state,
    pendingChoice: {
      kind: 'house',
      title: 'Ghar le lo',
      copy: 'Broker says inventory is moving. EMI replaces rent. Relatives already know.',
      payableTierIds,
    },
    phase: 'awaitingChoice',
    offered: { ...state.offered, house: true },
  };
}

function maybeMarriage(state: GameState): GameState {
  return state;
}

function maybeKid(state: GameState): GameState {
  return state;
}

function maybeHouse(state: GameState): GameState {
  if (state.house || !payableHouseTiers(state).includes('bhk2')) {
    return state;
  }
  if (!state.offered.house || (state.ageMonths === 0 && state.yearsPlayed > 0)) {
    return housePending(state);
  }
  return state;
}

function maybeCar(state: GameState): GameState {
  return state;
}

function maybeTaunt(state: GameState): GameState {
  return state;
}

export function maybeChoice(state: GameState): GameState {
  if (state.phase === 'ended') {
    return state;
  }
  let next = maybeMarriage(state);
  if (next.phase === 'awaitingChoice') return next;
  next = maybeKid(next);
  if (next.phase === 'awaitingChoice') return next;
  next = maybeHouse(next);
  if (next.phase === 'awaitingChoice') return next;
  next = maybeCar(next);
  if (next.phase === 'awaitingChoice') return next;
  return maybeTaunt(next);
}

export function openChoice(state: GameState, kind: ChoiceKind): GameState {
  if (state.phase !== 'playing') {
    return state;
  }
  if (kind === 'house' && !state.house && payableHouseTiers(state).length > 0) {
    return housePending(state);
  }
  return state;
}

export function applyChoice(state: GameState, input: ChoiceInput): GameState {
  if (state.phase !== 'awaitingChoice' || !state.pendingChoice) {
    return state;
  }
  if (input.action === 'dismiss') {
    return { ...state, pendingChoice: null, phase: 'playing' };
  }
  if (state.pendingChoice.kind !== 'house') {
    return state;
  }
  const tier = HOUSE_TIERS.find((row) => row.id === input.tierId);
  if (!tier || !payableHouseTiers(state).includes(tier.id)) {
    return state;
  }

  const down = downPayment(tier.price);
  let next = payBill(state, down, `Home down payment · ${tier.label}`);
  if (next.phase === 'ended') {
    return { ...next, pendingChoice: null };
  }
  const principal = tier.price - down;
  next = {
    ...next,
    pendingChoice: null,
    phase: 'playing',
    rent: 0,
    house: { tierId: tier.id, purchasePrice: tier.price, currentValue: tier.price },
    loans: [...next.loans, originateLoan('home', principal, HOME_ANNUAL_RATE, HOME_YEARS)],
  };
  return pushLedger(next, 'choice', `Bought ${tier.label}`, 0);
}
