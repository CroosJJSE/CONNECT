import type {
  FinanceTransaction,
  MonthlyBudget,
  TransactionCategory,
  TransactionType,
} from '../models/finance';

const CATEGORY_RULES: Array<{
  category: TransactionCategory;
  keywords: readonly string[];
}> = [
  {
    category: 'Salary & Income',
    keywords: ['salary', 'payroll', 'freelance', 'deposit', 'dividend', 'refund', 'stipend', 'invoice'],
  },
  {
    category: 'Groceries',
    keywords: ['keells', 'cargills', 'arpico', 'supermarket', 'grocery', 'market', 'produce', 'bakery', 'organic'],
  },
  {
    category: 'Utilities & Housing',
    keywords: ['ceb', 'electricity', 'water', 'internet', 'fiber', 'dialog', 'slt', 'rent', 'solar', 'maintenance', 'hoa'],
  },
  {
    category: 'Transport',
    keywords: ['uber', 'pickme', 'fuel', 'petrol', 'diesel', 'train', 'bus', 'parking', 'highway'],
  },
  {
    category: 'Community & Sharing',
    keywords: ['potluck', 'gcf', 'co-op', 'coop', 'donation', 'garden', 'shared', 'community'],
  },
  {
    category: 'Dining & Cafe',
    keywords: ['cafe', 'coffee', 'restaurant', 'bistro', 'tea', 'lunch', 'dinner', 'kottu'],
  },
  {
    category: 'Health & Care',
    keywords: ['pharmacy', 'clinic', 'doctor', 'hospital', 'dental', 'wellness', 'gym'],
  },
];

export function categorizeTransaction(
  text: string,
  type: TransactionType
): { category: TransactionCategory; autoCategorized: boolean } {
  if (type === 'income') {
    return { category: 'Salary & Income', autoCategorized: true };
  }
  const normalized = text.toLowerCase();
  for (const rule of CATEGORY_RULES) {
    if (rule.category === 'Salary & Income') continue;
    if (rule.keywords.some((kw) => normalized.includes(kw))) {
      return { category: rule.category, autoCategorized: true };
    }
  }
  return { category: 'Other', autoCategorized: false };
}

export interface MonthlyFinanceSummary {
  totalIncome: number;
  totalExpenses: number;
  netBalance: number;
  savingsRatePercent: number;
}

export function computeMonthlySummary(transactions: readonly FinanceTransaction[]): MonthlyFinanceSummary {
  let totalIncome = 0;
  let totalExpenses = 0;

  for (const tx of transactions) {
    if (tx.type === 'income') {
      totalIncome += tx.amount;
    } else {
      totalExpenses += tx.amount;
    }
  }

  const netBalance = totalIncome - totalExpenses;
  const savingsRatePercent =
    totalIncome > 0 ? Math.max(0, Math.round(((totalIncome - totalExpenses) / totalIncome) * 100)) : 0;

  return {
    totalIncome,
    totalExpenses,
    netBalance,
    savingsRatePercent,
  };
}

export interface CategorySpendBreakdown {
  category: Exclude<TransactionCategory, 'Salary & Income'>;
  spent: number;
  budgetLimit: number;
  utilizationPercent: number;
  overBudget: boolean;
}

export function computeCategorySpend(
  transactions: readonly FinanceTransaction[],
  budgets: readonly MonthlyBudget[]
): CategorySpendBreakdown[] {
  const spendMap = new Map<Exclude<TransactionCategory, 'Salary & Income'>, number>();

  for (const tx of transactions) {
    if (tx.type === 'expense' && tx.category !== 'Salary & Income') {
      spendMap.set(tx.category, (spendMap.get(tx.category) ?? 0) + tx.amount);
    }
  }

  const categories = new Set<Exclude<TransactionCategory, 'Salary & Income'>>([
    ...budgets.map((b) => b.category),
    ...spendMap.keys(),
  ]);

  return Array.from(categories).map((category) => {
    const spent = spendMap.get(category) ?? 0;
    const budgetLimit = budgets.find((b) => b.category === category)?.monthlyLimit ?? 0;
    const utilizationPercent =
      budgetLimit > 0 ? Math.round((spent / budgetLimit) * 100) : spent > 0 ? 100 : 0;

    return {
      category,
      spent,
      budgetLimit,
      utilizationPercent,
      overBudget: budgetLimit > 0 && spent > budgetLimit,
    };
  });
}
