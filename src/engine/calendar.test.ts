import { describe, expect, it } from 'vitest';
import { ageLabel, calendarMonth, calendarYear, monthLabel } from './calendar';

describe('calendar', () => {
  it('maps ageMonths 0 to July', () => {
    expect(calendarMonth(0)).toBe(7);
    expect(calendarMonth(5)).toBe(12);
    expect(calendarMonth(6)).toBe(1);
    expect(calendarMonth(11)).toBe(6);
  });

  it('keeps 2026 through December of year 0, then January 2027', () => {
    expect(calendarYear(0, 0)).toBe(2026);
    expect(calendarYear(0, 5)).toBe(2026);
    expect(calendarYear(0, 6)).toBe(2027);
    expect(calendarYear(1, 0)).toBe(2027);
  });

  it('formats labels', () => {
    expect(ageLabel(25, 3)).toBe('25y 3m');
    expect(monthLabel(0, 3)).toBe('Oct 2026');
  });
});
