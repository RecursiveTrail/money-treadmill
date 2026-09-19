import type { GameState, PendingEvent, Rng } from './types';

export const LIFE_EVENTS: readonly PendingEvent[] = [
  { id: 'wedding', title: 'Destination wedding', copy: "Friend's destination wedding. You can't say no.", cost: 25_000 },
  { id: 'root-canal', title: 'Root canal', copy: 'Root canal. Insurance denied the claim.', cost: 15_000 },
  { id: 'brewery', title: 'Microbrewery', copy: 'Weekend at a microbrewery went out of hand.', cost: 8_000 },
  { id: 'car-sensor', title: 'Car service', copy: 'Car service and random sensor failure.', cost: 18_000 },
  { id: 'parents', title: "Parents' tests", copy: "Parents' full-body checkup. You are the wallet.", cost: 22_000 },
  { id: 'diwali', title: 'Diwali haul', copy: 'Diwali shopping. "Just this year."', cost: 12_000 },
  { id: 'iphone', title: 'Upgrade', copy: 'iPhone because the EMI is "only ₹4,000". You pay lump-sum anyway.', cost: 20_000 },
  { id: 'society', title: 'Maintenance', copy: 'Society maintenance arrears + sinking fund.', cost: 9_000 },
  { id: 'offsite', title: 'Optional offsite', copy: 'Office offsite. Optional, according to the email.', cost: 14_000 },
  { id: 'cousin', title: 'Shagun', copy: "Cousin's engagement. Envelope physics.", cost: 11_000 },
  { id: 'plumber', title: 'Tank + plumber', copy: 'Water tank cleaning plus a plumber who found "one more issue".', cost: 7_000 },
  { id: 'flight', title: 'Emergency flight', copy: 'Last-minute flight home. Dynamic pricing sends regards.', cost: 16_000 },
  { id: 'ca-fee', title: 'CA and advance tax', copy: 'CA fee plus an advance-tax surprise.', cost: 10_000 },
  { id: 'mba-fomo', title: 'Weekend MBA', copy: 'Online MBA ad. You enroll at 1 a.m.', cost: 25_000 },
  { id: 'swiggy', title: 'Subscriptions', copy: 'Swiggy + Hotstar + "I\'ll cancel later" finally catch up.', cost: 6_000 },
];

export function eligibleLifeEvents(state: GameState): PendingEvent[] {
  return LIFE_EVENTS.filter((event) => {
    if (event.id === 'society' || event.id === 'plumber') {
      return state.house !== null;
    }
    if (event.id === 'car-sensor') {
      return state.ownedCar;
    }
    return true;
  });
}

export function pickLifeEvent(state: GameState, rng: Rng): PendingEvent | null {
  const pool = eligibleLifeEvents(state);
  if (pool.length === 0) {
    return null;
  }
  const index = Math.min(pool.length - 1, Math.floor(rng() * pool.length));
  return pool[index]!;
}
