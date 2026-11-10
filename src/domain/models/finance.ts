export type TransactionType = 'income' | 'expense';

export type TransactionCategory =
  | 'Groceries'
  | 'Utilities & Housing'
  | 'Transport'
  | 'Community & Sharing'
  | 'Dining & Cafe'
  | 'Health & Care'
  | 'Salary & Income'
  | 'Other';

export type TransactionSource = 'manual' | 'android_sms_future';

export interface FinanceTransaction {
  id: string;
  ownerId: string;
  title: string;
  merchant?: string;
  amount: number;
  type: TransactionType;
  category: TransactionCategory;
  autoCategorized: boolean;
  source: TransactionSource;
  occurredAtIso: string;
  notes?: string;
}

export interface MonthlyBudget {
  id: string;
  ownerId: string;
  category: Exclude<TransactionCategory, 'Salary & Income'>;
  monthlyLimit: number;
}

export interface SavingsGoal {
  id: string;
  ownerId: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDateIso: string;
}

export interface ParsedSmsTransaction {
  matched: boolean;
  amount: number;
  type: TransactionType;
  merchant: string;
  suggestedCategory: TransactionCategory;
  rawSnippet: string;
}
