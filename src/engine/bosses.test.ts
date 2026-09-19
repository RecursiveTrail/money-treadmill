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
    const next = applyBossEffect(startGame(DEFAULT_SETUP), boss);
    expect(next.ltcgRate).toBe(0.125);
  });

  it('rotates year 4+ by (yearsPlayed - 4) % 6', () => {
    expect(getAnnualBoss(4).id).toBe('hike-6');
    expect(getAnnualBoss(6).id).toBe('diwali-boss');
    expect(getAnnualBoss(10).id).toBe('hike-6');
  });
});

describe('applyBossEffect rent-spike and expenseMul', () => {
  it('year-3 rent-spike adds 2000 to rent when rent > 0', () => {
    const boss = getAnnualBoss(3);
    expect(boss.id).toBe('rent-spike');
    const base = { ...startGame(DEFAULT_SETUP), livingExpenses: 30_000, rent: 25_000 };
    const next = applyBossEffect(base, boss);
    expect(next.rent).toBe(27_000);
    expect(next.livingExpenses).toBe(30_000);
  });

  it('year-3 rent-spike adds 2000 to living when rent is 0', () => {
    const boss = getAnnualBoss(3);
    const base = { ...startGame(DEFAULT_SETUP), livingExpenses: 55_000, rent: 0 };
    const next = applyBossEffect(base, boss);
    expect(next.rent).toBe(0);
    expect(next.livingExpenses).toBe(57_000);
  });

  it('cpi-5 rounds living and rent independently when rent > 0', () => {
    const boss = getAnnualBoss(5);
    expect(boss.id).toBe('cpi-5');
    const base = { ...startGame(DEFAULT_SETUP), livingExpenses: 10_011, rent: 3_333 };
    const next = applyBossEffect(base, boss);
    expect(next.livingExpenses).toBe(10_512);
    expect(next.rent).toBe(3_500);
  });

  it('cpi-5 rounds living only and keeps rent at 0 when rent is 0', () => {
    const boss = getAnnualBoss(5);
    const base = { ...startGame(DEFAULT_SETUP), livingExpenses: 10_011, rent: 0 };
    const next = applyBossEffect(base, boss);
    expect(next.livingExpenses).toBe(10_512);
    expect(next.rent).toBe(0);
  });
});
