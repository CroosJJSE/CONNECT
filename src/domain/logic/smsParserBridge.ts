import type { ParsedSmsTransaction, TransactionType } from '../models/finance';
import { categorizeTransaction } from './financeCategorizer';

/**
 * Pure platform-independent SMS bank transaction parser.
 * Prepared for future Android React Native / Expo native SMS ingestion.
 * Web application NEVER requests SMS permissions.
 */
export function parseBankSmsText(rawSms: string): ParsedSmsTransaction {
  const cleaned = rawSms.trim();
  const amountMatch = cleaned.match(/(?:LKR|Rs\.?|USD|\$)\s?([0-9,]+(?:\.[0-9]{1,2})?)/i);

  if (!amountMatch) {
    return {
      matched: false,
      amount: 0,
      type: 'expense',
      merchant: '',
      suggestedCategory: 'Other',
      rawSnippet: cleaned,
    };
  }

  const amount = Number.parseFloat(amountMatch[1].replace(/,/g, ''));
  const lower = cleaned.toLowerCase();
  const type: TransactionType =
    lower.includes('credited') || lower.includes('received') || lower.includes('deposit')
      ? 'income'
      : 'expense';

  const merchantMatch = cleaned.match(/(?:at|to|from)\s+([A-Za-z0-9 &.'-]{2,36})/i);
  const merchant = merchantMatch ? merchantMatch[1].trim() : 'Bank Alert Transaction';

  const { category } = categorizeTransaction(`${merchant} ${cleaned}`, type);

  return {
    matched: Number.isFinite(amount) && amount > 0,
    amount: Number.isFinite(amount) ? amount : 0,
    type,
    merchant,
    suggestedCategory: category,
    rawSnippet: cleaned,
  };
}
