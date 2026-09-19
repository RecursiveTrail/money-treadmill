import { formatInr } from '../lib/formatInr';

export function ledgerLine(text: string, amount: number): string {
  if (amount === 0) return text;
  if (text.includes('₹')) return text;
  return `${text} ${formatInr(amount)}`;
}
