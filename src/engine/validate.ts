import type { SetupConfig } from './types';

export function validateSetup(setup: SetupConfig): string[] {
  const errors: string[] = [];
  const money = [
    setup.monthlySalary,
    setup.fixedExpenses,
    setup.plannedSip,
    setup.targetCorpusToday,
  ];
  if (!Number.isInteger(setup.startAgeYears) || !Number.isInteger(setup.targetRetirementAge)) {
    errors.push('Ages must be numbers.');
  }
  if (setup.targetRetirementAge <= setup.startAgeYears) {
    errors.push('Retirement age must be after starting age.');
  }
  if (money.some((n) => !Number.isFinite(n) || n < 0)) {
    errors.push('Money fields must be zero or more.');
  }
  if (setup.fixedExpenses >= setup.monthlySalary) {
    errors.push('Expenses must be less than salary.');
  }
  return errors;
}
