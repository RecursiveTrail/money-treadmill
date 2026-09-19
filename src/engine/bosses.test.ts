import { describe, expect, it } from 'vitest';
import { applyBossEffect, getAnnualBoss } from './bosses';
import { DEFAULT_SETUP } from './defaults';
import { startGame } from './state';

describe('getAnnualBoss', () => {
  it('throws when yearsPlayed is below 1', () => {
    expect(() => getAnnualBoss(0)).toThrow(/yearsPlayed >= 1/);
  });

  it('sets year-2 LTCG to 12.5%', () => {
    const boss = getAnnualBoss(2);
    expect(boss.id).toBe('ltcg-hike');
    const next = applyBossEffect(startGame(DEFAULT_SETUP), boss.effect);
    expect(next.ltcgRate).toBe(0.125);
  });

  it('rotates year 4+ by (yearsPlayed - 4) % 6', () => {
    expect(getAnnualBoss(4).id).toBe('hike-6');
    expect(getAnnualBoss(6).id).toBe('diwali-boss');
    expect(getAnnualBoss(10).id).toBe('hike-6');
  });
});
