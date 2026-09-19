import { describe, expect, it } from 'vitest';
import { LIFE_EVENTS, pickLifeEvent } from './events';

describe('LIFE_EVENTS', () => {
  it('has 15 events including the PRD four', () => {
    expect(LIFE_EVENTS).toHaveLength(15);
    expect(LIFE_EVENTS.map((e) => e.id)).toEqual(
      expect.arrayContaining(['wedding', 'root-canal', 'brewery', 'car-sensor']),
    );
  });

  it('picks by injected rng', () => {
    expect(pickLifeEvent(() => 0).id).toBe(LIFE_EVENTS[0]?.id);
  });
});
