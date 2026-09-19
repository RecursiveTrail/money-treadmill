import { describe, expect, it } from 'vitest';
import { DEFAULT_SETUP } from './defaults';
import { eligibleLifeEvents, LIFE_EVENTS, pickLifeEvent } from './events';
import { startGame } from './state';

describe('LIFE_EVENTS', () => {
  it('has 15 events including the PRD four', () => {
    expect(LIFE_EVENTS).toHaveLength(15);
    expect(LIFE_EVENTS.map((e) => e.id)).toEqual(
      expect.arrayContaining(['wedding', 'root-canal', 'brewery', 'car-sensor']),
    );
  });

  it('picks by injected rng from the eligible pool', () => {
    const state = startGame(DEFAULT_SETUP);
    expect(pickLifeEvent(state, () => 0)?.id).toBe(eligibleLifeEvents(state)[0]?.id);
  });

  it('never picks house or car bills without those assets', () => {
    const state = startGame(DEFAULT_SETUP);
    const ids = Array.from({ length: 100 }, (_, i) => pickLifeEvent(state, () => i / 100)?.id);
    expect(ids).not.toContain('society');
    expect(ids).not.toContain('plumber');
    expect(ids).not.toContain('car-sensor');
  });

  it('allows those bills when the assets exist', () => {
    const state = {
      ...startGame(DEFAULT_SETUP),
      house: { tierId: 'bhk2' as const, purchasePrice: 80_00_000, currentValue: 80_00_000 },
      ownedCar: true,
    };
    const ids = eligibleLifeEvents(state).map((event) => event.id);
    expect(ids).toEqual(expect.arrayContaining(['society', 'plumber', 'car-sensor']));
  });
});
