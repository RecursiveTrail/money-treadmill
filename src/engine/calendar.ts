import { ORIGIN_YEAR } from './defaults';

const MONTH_BY_AGE = [7, 8, 9, 10, 11, 12, 1, 2, 3, 4, 5, 6] as const;
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function calendarMonth(ageMonths: number): number {
  return MONTH_BY_AGE[ageMonths] ?? 7;
}

export function calendarYear(yearsPlayed: number, ageMonths: number): number {
  return ORIGIN_YEAR + yearsPlayed + (ageMonths >= 6 ? 1 : 0);
}

export function ageLabel(ageYears: number, ageMonths: number): string {
  return `${ageYears}y ${ageMonths}m`;
}

export function monthLabel(yearsPlayed: number, ageMonths: number): string {
  const month = calendarMonth(ageMonths);
  return `${MONTH_NAMES[month - 1]} ${calendarYear(yearsPlayed, ageMonths)}`;
}
