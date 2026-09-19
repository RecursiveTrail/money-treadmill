import { DOWN_PAYMENT_RATE, STCG_RATE } from './defaults';
import type { Loan, LoanKind } from './types';

export function downPayment(price: number): number {
  return Math.round(price * DOWN_PAYMENT_RATE);
}

export function emi(principal: number, annualRate: number, years: number): number {
  const r = annualRate / 12;
  const n = years * 12;
  const growth = (1 + r) ** n;
  return Math.round((principal * r * growth) / (growth - 1));
}

export function originateLoan(
  kind: LoanKind,
  principal: number,
  annualRate: number,
  years: number,
): Loan {
  const monthsTotal = years * 12;
  return {
    kind,
    originalPrincipal: principal,
    principalRemaining: principal,
    annualRate,
    emi: emi(principal, annualRate, years),
    monthsTotal,
    monthsRemaining: monthsTotal,
  };
}

export function amortize(loan: Loan): Loan | null {
  const interest = Math.round(loan.principalRemaining * (loan.annualRate / 12));
  const principalPaid = Math.min(Math.max(loan.emi - interest, 0), loan.principalRemaining);
  const principalRemaining = loan.principalRemaining - principalPaid;
  const monthsRemaining = loan.monthsRemaining - 1;
  if (principalRemaining <= 0 || monthsRemaining <= 0) {
    return null;
  }
  return { ...loan, principalRemaining, monthsRemaining };
}

export function canPayFromBalance(cash: number, portfolio: number, amount: number): boolean {
  if (amount <= 0) {
    return true;
  }
  if (cash >= amount) {
    return true;
  }
  const shortfall = amount - cash;
  return portfolio >= Math.round(shortfall * (1 + STCG_RATE));
}

export function canAffordDownPayment(cash: number, portfolio: number, price: number): boolean {
  return canPayFromBalance(cash, portfolio, downPayment(price));
}

export function homePrincipal(loans: Loan[]): number {
  return loans.find((loan) => loan.kind === 'home')?.principalRemaining ?? 0;
}
