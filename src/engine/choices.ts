import {
  BIRTH_COST,
  CAR_ANNUAL_RATE,
  CAR_YEARS,
  HOME_ANNUAL_RATE,
  HOME_YEARS,
  KID_LIVING_BUMP,
  WEDDING_MAX,
  WEDDING_MIN,
  WEDDING_RECOMMENDED,
  WEDDING_STEP,
} from './defaults';
import { payBill } from './economy';
import { canAffordDownPayment, downPayment, originateLoan } from './loans';
import { pushLedger } from './state';
import type { CarTierId, ChoiceInput, ChoiceKind, GameState, HouseTierId } from './types';

export const HOUSE_TIERS = [
  { id: 'bhk2' as const, label: '2 BHK', price: 80_00_000 },
  { id: 'bhk3' as const, label: '3 BHK', price: 1_10_00_000 },
  { id: 'premium' as const, label: 'Premium 3 BHK', price: 1_60_00_000 },
];

export const CAR_TIERS = [
  { id: 'used' as const, label: 'Used', price: 5_00_000 },
  { id: 'new' as const, label: 'New', price: 10_00_000 },
  { id: 'suv' as const, label: 'SUV', price: 20_00_000 },
];

export function weddingCopy(spend: number): string {
  if (spend < 5_00_000) {
    return 'Spouse has been staring at the laminated menu. Relatives sent a condolence GIF.';
  }
  if (spend <= 10_00_000) {
    return 'Respectable. The aunties will still talk.';
  }
  return 'Izzat delivered. The FD is a husk.';
}

export function payableHouseTiers(state: GameState): HouseTierId[] {
  return HOUSE_TIERS.filter((tier) =>
    canAffordDownPayment(state.cashBuffer, state.portfolioValue, tier.price),
  ).map((tier) => tier.id);
}

export function payableCarTiers(state: GameState): CarTierId[] {
  return CAR_TIERS.filter((tier) =>
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
  if (state.ageYears < 30 || state.married || state.offered.marriage) {
    return state;
  }
  return {
    ...state,
    pendingChoice: {
      kind: 'marriage',
      title: 'Shaadi',
      copy: 'Choose how much family prestige the FD can absorb.',
      recommended: WEDDING_RECOMMENDED,
      minSpend: WEDDING_MIN,
      maxSpend: WEDDING_MAX,
      step: WEDDING_STEP,
    },
    phase: 'awaitingChoice',
    offered: { ...state.offered, marriage: true },
  };
}

function maybeKid(state: GameState): GameState {
  if (!state.married || state.hasChild || state.offered.kid) {
    return state;
  }
  return {
    ...state,
    pendingChoice: {
      kind: 'kid',
      title: 'Bacche?',
      copy: 'One tiny dependent, one permanent line item.',
      birthCost: BIRTH_COST,
    },
    phase: 'awaitingChoice',
    offered: { ...state.offered, kid: true },
  };
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
  if (state.ownedCar || !payableCarTiers(state).includes('used')) {
    return state;
  }
  if (!state.offered.car || (state.ageMonths === 0 && state.yearsPlayed > 0)) {
    return {
      ...state,
      pendingChoice: {
        kind: 'car',
        title: 'Gaadi le lo',
        copy: 'The colony has noticed your cab receipts. Pick an EMI with wheels.',
        payableTierIds: payableCarTiers(state),
      },
      phase: 'awaitingChoice',
      offered: { ...state.offered, car: true },
    };
  }
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
  if (kind === 'car' && !state.ownedCar && payableCarTiers(state).length > 0) {
    return {
      ...state,
      pendingChoice: {
        kind: 'car',
        title: 'Gaadi le lo',
        copy: 'The colony has noticed your cab receipts. Pick an EMI with wheels.',
        payableTierIds: payableCarTiers(state),
      },
      phase: 'awaitingChoice',
      offered: { ...state.offered, car: true },
    };
  }
  if (kind === 'marriage' && state.ageYears >= 30 && !state.married) {
    return {
      ...state,
      pendingChoice: {
        kind: 'marriage',
        title: 'Shaadi',
        copy: 'Choose how much family prestige the FD can absorb.',
        recommended: WEDDING_RECOMMENDED,
        minSpend: WEDDING_MIN,
        maxSpend: WEDDING_MAX,
        step: WEDDING_STEP,
      },
      phase: 'awaitingChoice',
      offered: { ...state.offered, marriage: true },
    };
  }
  if (kind === 'kid' && state.married && !state.hasChild) {
    return {
      ...state,
      pendingChoice: {
        kind: 'kid',
        title: 'Bacche?',
        copy: 'One tiny dependent, one permanent line item.',
        birthCost: BIRTH_COST,
      },
      phase: 'awaitingChoice',
      offered: { ...state.offered, kid: true },
    };
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
  if (state.pendingChoice.kind === 'house') {
    const tier = HOUSE_TIERS.find((row) => row.id === input.tierId);
    if (!tier || !payableHouseTiers(state).includes(tier.id) || state.house) {
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
  if (state.pendingChoice.kind === 'car') {
    const tier = CAR_TIERS.find((row) => row.id === input.tierId);
    if (!tier || !payableCarTiers(state).includes(tier.id) || state.ownedCar) {
      return state;
    }

    const down = downPayment(tier.price);
    let next = payBill(state, down, `Car down payment · ${tier.label}`);
    if (next.phase === 'ended') {
      return { ...next, pendingChoice: null };
    }
    const principal = tier.price - down;
    next = {
      ...next,
      pendingChoice: null,
      phase: 'playing',
      ownedCar: true,
      loans: [...next.loans, originateLoan('car', principal, CAR_ANNUAL_RATE, CAR_YEARS)],
    };
    return pushLedger(next, 'choice', `Bought ${tier.label} car`, 0);
  }
  if (state.pendingChoice.kind === 'marriage') {
    if (input.spend === undefined || !Number.isFinite(input.spend)) {
      return state;
    }
    const spend = Math.max(
      WEDDING_MIN,
      Math.min(
        WEDDING_MAX,
        Math.round(input.spend / WEDDING_STEP) * WEDDING_STEP,
      ),
    );
    const next = payBill(state, spend, weddingCopy(spend));
    if (next.phase === 'ended') {
      return state;
    }
    return {
      ...next,
      pendingChoice: null,
      phase: 'playing',
      married: true,
    };
  }
  if (state.pendingChoice.kind === 'kid') {
    const next = payBill(state, BIRTH_COST, 'Birth and hospital bill');
    if (next.phase === 'ended') {
      return state;
    }
    return {
      ...next,
      pendingChoice: null,
      phase: 'playing',
      hasChild: true,
      childMonths: 0,
      livingExpenses: next.livingExpenses + KID_LIVING_BUMP,
    };
  }
  return state;
}
