import { useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  PiggyBank,
  Plus,
  Smartphone,
  Target,
  Trash2,
  Wallet,
} from 'lucide-react';
import type { TransactionCategory, TransactionType } from '../domain/models';
import {
  categorizeTransaction,
  computeCategorySpend,
  computeMonthlySummary,
} from '../domain/logic/financeCategorizer';
import { formatCurrency } from '../domain/logic/formatting';
import { parseBankSmsText } from '../domain/logic/smsParserBridge';
import { validateTransactionInput } from '../domain/validation/validators';
import { useAuth } from '../hooks/useAuth';
import { useConnectData } from '../hooks/useConnectData';
import { services } from '../services/serviceContainer';
import { ModalSheet } from '../components/common/ModalSheet';

const EXPENSE_CATEGORIES: Array<Exclude<TransactionCategory, 'Salary & Income'>> = [
  'Groceries',
  'Utilities & Housing',
  'Transport',
  'Community & Sharing',
  'Dining & Cafe',
  'Health & Care',
  'Other',
];

export function FinancePage({ searchQuery }: { searchQuery: string }) {
  const { user } = useAuth();
  const {
    transactions,
    budgets,
    savingsGoals,
    addTransaction,
    deleteTransaction,
    contributeToGoal,
    createSavingsGoal,
    updateBudgetLimit,
  } = useConnectData();

  const [txFilter, setTxFilter] = useState<'all' | 'expense' | 'income'>('all');
  const [addTxOpen, setAddTxOpen] = useState(false);
  const [addGoalOpen, setAddGoalOpen] = useState(false);
  const [smsTesterOpen, setSmsTesterOpen] = useState(false);

  // Add transaction form
  const [txTitle, setTxTitle] = useState('');
  const [txAmount, setTxAmount] = useState('');
  const [txType, setTxType] = useState<TransactionType>('expense');
  const [manualCategory, setManualCategory] = useState<TransactionCategory | 'auto'>('auto');
  const [txError, setTxError] = useState<string | null>(null);

  // Add goal form
  const [goalName, setGoalName] = useState('');
  const [goalTarget, setGoalTarget] = useState('');
  const [goalDate, setGoalDate] = useState('2027-06-01');

  // Android SMS bridge parser test harness (no SMS permission requested on web!)
  const [sampleSms, setSampleSms] = useState(
    'Your card ending 4419 was charged LKR 4,250.00 at Keells Super Havelock on 10/11.'
  );

  const summary = useMemo(() => computeMonthlySummary(transactions), [transactions]);
  const categoryBreakdown = useMemo(
    () => computeCategorySpend(transactions, budgets),
    [transactions, budgets]
  );

  const liveSuggestedCategory = useMemo(
    () => categorizeTransaction(txTitle, txType),
    [txTitle, txType]
  );

  const parsedSmsPreview = useMemo(() => parseBankSmsText(sampleSms), [sampleSms]);

  const filteredTransactions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return transactions.filter((tx) => {
      if (txFilter !== 'all' && tx.type !== txFilter) return false;
      if (!q) return true;
      return (
        tx.title.toLowerCase().includes(q) ||
        tx.category.toLowerCase().includes(q) ||
        (tx.merchant?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [transactions, txFilter, searchQuery]);

  if (!user) return null;

  const currency = user.preferredCurrency;
  const maxCategorySpend = Math.max(1, ...categoryBreakdown.map((c) => Math.max(c.spent, c.budgetLimit)));

  const handleSaveTransaction = async () => {
    const parsedAmount = Number.parseFloat(txAmount);
    const v = validateTransactionInput({ title: txTitle, amount: parsedAmount, type: txType });
    if (!v.valid) {
      setTxError(v.errors[0]);
      return;
    }
    setTxError(null);
    await addTransaction({
      title: txTitle,
      amount: parsedAmount,
      type: txType,
      category: manualCategory === 'auto' ? undefined : manualCategory,
    });
    setTxTitle('');
    setTxAmount('');
    setManualCategory('auto');
    setAddTxOpen(false);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-[28px] leading-tight font-semibold text-on-surface tracking-tight">
            Finance Tracker
          </h2>
          <p className="text-sm text-on-surface-variant mt-0.5">
            Personal cashflow, automatic categorization, monthly budgets, and savings goals.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setTxError(null);
            setAddTxOpen(true);
          }}
          className="min-h-[44px] px-4 py-2.5 rounded-xl bg-primary-container text-on-primary text-sm font-semibold hover:bg-primary transition-colors shadow-sm inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Transaction</span>
        </button>
      </div>

      {/* Kiwi-Inspired Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-surface-container-lowest rounded-xl shadow-sm p-4 flex flex-col gap-1">
          <div className="flex items-center justify-between text-xs text-on-surface-variant">
            <span>Monthly Net Balance</span>
            <Wallet className="w-4 h-4 text-primary" />
          </div>
          <p className="text-2xl font-bold text-on-surface tabular-nums">
            {formatCurrency(summary.netBalance, currency)}
          </p>
          <p className="text-xs text-primary font-medium tabular-nums">
            {summary.savingsRatePercent}% savings rate
          </p>
        </div>

        <div className="bg-surface-container-lowest rounded-xl shadow-sm p-4 flex flex-col gap-1">
          <div className="flex items-center justify-between text-xs text-on-surface-variant">
            <span>Income</span>
            <ArrowDownRight className="w-4 h-4 text-primary" />
          </div>
          <p className="text-2xl font-bold text-on-surface tabular-nums">
            {formatCurrency(summary.totalIncome, currency)}
          </p>
          <p className="text-xs text-on-surface-variant">Owner-only private ledger</p>
        </div>

        <div className="bg-surface-container-lowest rounded-xl shadow-sm p-4 flex flex-col gap-1">
          <div className="flex items-center justify-between text-xs text-on-surface-variant">
            <span>Expenses</span>
            <ArrowUpRight className="w-4 h-4 text-tertiary" />
          </div>
          <p className="text-2xl font-bold text-on-surface tabular-nums">
            {formatCurrency(summary.totalExpenses, currency)}
          </p>
          <p className="text-xs text-on-surface-variant tabular-nums">
            {transactions.filter((t) => t.type === 'expense').length} entries this cycle
          </p>
        </div>

        <div className="bg-surface-container-low rounded-xl shadow-xs p-4 flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between text-xs font-semibold text-on-surface">
            <span>Android SMS Readiness</span>
            <Smartphone className="w-4 h-4 text-secondary" />
          </div>
          <p className="text-xs text-on-surface-variant leading-snug">
            Web does not request SMS permissions. Future Expo Android module connects here.
          </p>
          <button
            type="button"
            onClick={() => setSmsTesterOpen(true)}
            className="text-xs font-semibold text-primary hover:underline text-left"
          >
            Inspect SMS Parser Bridge →
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Spending Chart & Budgets */}
        <section className="lg:col-span-5 flex flex-col gap-5">
          {/* Spending vs Monthly Budgets Chart */}
          <div className="bg-surface-container-lowest rounded-xl shadow-sm p-5 flex flex-col gap-4">
            <h3 className="text-base font-semibold text-on-surface">
              Spending Summary &amp; Monthly Budgets
            </h3>

            <div className="flex flex-col gap-3.5">
              {categoryBreakdown.map((item) => {
                const spendWidth = Math.min(100, Math.round((item.spent / maxCategorySpend) * 100));
                return (
                  <div key={item.category} className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-semibold text-on-surface">{item.category}</span>
                      <span className="text-on-surface-variant tabular-nums">
                        {formatCurrency(item.spent, currency)}
                        {item.budgetLimit > 0 && ` / ${formatCurrency(item.budgetLimit, currency)}`}
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-surface-container rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          item.overBudget ? 'bg-error' : 'bg-primary-container'
                        }`}
                        style={{ width: `${Math.max(4, spendWidth)}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      {item.overBudget ? (
                        <span className="text-error font-semibold inline-flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> Over budget ({item.utilizationPercent}%)
                        </span>
                      ) : (
                        <span className="text-on-surface-variant tabular-nums">
                          {item.budgetLimit > 0
                            ? `${item.utilizationPercent}% of monthly limit`
                            : 'No limit set'}
                        </span>
                      )}
                      {item.budgetLimit > 0 && (
                        <button
                          type="button"
                          onClick={() =>
                            void updateBudgetLimit(
                              item.category,
                              item.budgetLimit + (currency === 'USD' ? 25 : 2500)
                            )
                          }
                          className="text-primary font-medium hover:underline"
                        >
                          + Raise limit
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Savings Goals */}
          <div className="bg-surface-container-lowest rounded-xl shadow-sm p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-primary" />
                <h3 className="text-base font-semibold text-on-surface">Savings Goals</h3>
              </div>
              <button
                type="button"
                onClick={() => setAddGoalOpen(true)}
                className="text-xs font-semibold text-primary hover:underline"
              >
                + New Goal
              </button>
            </div>

            <div className="flex flex-col gap-3">
              {savingsGoals.map((goal) => {
                const pct = Math.min(
                  100,
                  Math.round((goal.currentAmount / Math.max(1, goal.targetAmount)) * 100)
                );
                const quickAdd = currency === 'USD' ? 50 : 5000;
                return (
                  <div
                    key={goal.id}
                    className="p-3.5 rounded-xl bg-surface-container-low flex flex-col gap-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <PiggyBank className="w-4 h-4 text-tertiary shrink-0" />
                        <span className="text-sm font-semibold text-on-surface truncate">
                          {goal.name}
                        </span>
                      </div>
                      <span className="text-xs font-bold text-primary tabular-nums">{pct}%</span>
                    </div>
                    <div className="w-full h-2 bg-surface-container rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between gap-2 text-xs text-on-surface-variant">
                      <span className="tabular-nums">
                        {formatCurrency(goal.currentAmount, currency)} /{' '}
                        {formatCurrency(goal.targetAmount, currency)}
                      </span>
                      <button
                        type="button"
                        onClick={() => void contributeToGoal(goal.id, quickAdd)}
                        className="px-2.5 py-1 rounded-lg bg-surface-container-lowest text-primary font-semibold hover:bg-primary hover:text-on-primary transition-colors tabular-nums"
                      >
                        + {formatCurrency(quickAdd, currency)}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Right: Transaction History */}
        <section className="lg:col-span-7 bg-surface-container-lowest rounded-xl shadow-sm p-5 flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-base font-semibold text-on-surface">Transaction History</h3>
            <div className="inline-flex bg-surface-container-low p-1 rounded-lg gap-1">
              {(['all', 'expense', 'income'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTxFilter(t)}
                  className={`px-3 py-1 rounded-md text-xs font-medium capitalize transition-colors ${
                    txFilter === t
                      ? 'bg-surface-container-lowest text-on-surface font-semibold shadow-xs'
                      : 'text-on-surface-variant'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col divide-y divide-outline-variant/25">
            {filteredTransactions.map((tx) => (
              <div key={tx.id} className="py-3 flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-on-surface truncate">{tx.title}</p>
                    {tx.autoCategorized && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-primary-fixed text-on-primary-fixed">
                        Auto
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    {tx.category} · {new Date(tx.occurredAtIso).toLocaleDateString()}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`text-sm font-bold tabular-nums ${
                      tx.type === 'income' ? 'text-primary' : 'text-on-surface'
                    }`}
                  >
                    {tx.type === 'income' ? '+' : '-'}
                    {formatCurrency(tx.amount, currency)}
                  </span>
                  <button
                    type="button"
                    onClick={() => void deleteTransaction(tx.id)}
                    aria-label={`Delete ${tx.title}`}
                    className="p-2 rounded-lg text-outline hover:text-error hover:bg-error-container/40 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Add Transaction Modal */}
      <ModalSheet
        open={addTxOpen}
        title="Add Transaction"
        subtitle="Automatic categorization runs automatically as you type"
        onClose={() => setAddTxOpen(false)}
      >
        <div className="flex flex-col gap-3.5">
          <div className="grid grid-cols-2 gap-2 bg-surface-container-low p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setTxType('expense')}
              className={`min-h-[40px] rounded-lg text-xs font-semibold ${
                txType === 'expense'
                  ? 'bg-surface-container-lowest text-tertiary shadow-xs'
                  : 'text-on-surface-variant'
              }`}
            >
              Expense
            </button>
            <button
              type="button"
              onClick={() => setTxType('income')}
              className={`min-h-[40px] rounded-lg text-xs font-semibold ${
                txType === 'income'
                  ? 'bg-surface-container-lowest text-primary shadow-xs'
                  : 'text-on-surface-variant'
              }`}
            >
              Income
            </button>
          </div>

          <input
            type="text"
            value={txTitle}
            onChange={(e) => setTxTitle(e.target.value)}
            placeholder="Description or merchant (e.g., Keells Grocery, PickMe, Freelance)"
            className="w-full min-h-[44px] px-3 rounded-xl bg-surface-container-low text-sm text-on-surface focus:outline-none"
          />

          <input
            type="number"
            min="1"
            step="any"
            value={txAmount}
            onChange={(e) => setTxAmount(e.target.value)}
            placeholder={`Amount (${currency})`}
            className="w-full min-h-[44px] px-3 rounded-xl bg-surface-container-low text-sm text-on-surface tabular-nums focus:outline-none"
          />

          <div>
            <label className="block text-xs font-medium text-on-surface-variant mb-1">
              Category (Auto-detected: <strong>{liveSuggestedCategory.category}</strong>)
            </label>
            <select
              value={manualCategory}
              onChange={(e) =>
                setManualCategory(e.target.value as TransactionCategory | 'auto')
              }
              className="w-full min-h-[44px] px-3 rounded-xl bg-surface-container-low text-sm text-on-surface focus:outline-none"
            >
              <option value="auto">
                Auto-categorize ({liveSuggestedCategory.category})
              </option>
              {txType === 'income' ? (
                <option value="Salary & Income">Salary &amp; Income</option>
              ) : (
                EXPENSE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))
              )}
            </select>
          </div>

          {txError && <p className="text-xs font-medium text-error">{txError}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setAddTxOpen(false)}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-surface-container text-on-surface text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleSaveTransaction()}
              className="min-h-[44px] px-5 py-2 rounded-xl bg-primary text-on-primary text-sm font-semibold"
            >
              Save
            </button>
          </div>
        </div>
      </ModalSheet>

      {/* Add Savings Goal Modal */}
      <ModalSheet open={addGoalOpen} title="Create Savings Goal" onClose={() => setAddGoalOpen(false)}>
        <div className="flex flex-col gap-3.5">
          <input
            type="text"
            value={goalName}
            onChange={(e) => setGoalName(e.target.value)}
            placeholder="Goal name (e.g., Home Solar Inverter)"
            className="w-full min-h-[44px] px-3 rounded-xl bg-surface-container-low text-sm text-on-surface focus:outline-none"
          />
          <input
            type="number"
            min="1"
            value={goalTarget}
            onChange={(e) => setGoalTarget(e.target.value)}
            placeholder={`Target amount (${currency})`}
            className="w-full min-h-[44px] px-3 rounded-xl bg-surface-container-low text-sm text-on-surface tabular-nums focus:outline-none"
          />
          <input
            type="date"
            value={goalDate}
            onChange={(e) => setGoalDate(e.target.value)}
            className="w-full min-h-[44px] px-3 rounded-xl bg-surface-container-low text-sm text-on-surface focus:outline-none"
          />
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setAddGoalOpen(false)}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-surface-container text-on-surface text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                const targetNum = Number.parseFloat(goalTarget);
                if (!goalName.trim() || !Number.isFinite(targetNum) || targetNum <= 0) return;
                void createSavingsGoal(goalName, targetNum, goalDate);
                setGoalName('');
                setGoalTarget('');
                setAddGoalOpen(false);
              }}
              className="min-h-[44px] px-5 py-2 rounded-xl bg-primary text-on-primary text-sm font-semibold"
            >
              Create Goal
            </button>
          </div>
        </div>
      </ModalSheet>

      {/* Future Android SMS Bridge Readiness Drawer */}
      <ModalSheet
        open={smsTesterOpen}
        title="Android SMS Parser Bridge (Architecture Preview)"
        subtitle={services.smsBridge.getArchitectureNotice()}
        onClose={() => setSmsTesterOpen(false)}
      >
        <div className="flex flex-col gap-4">
          <div className="p-3 rounded-xl bg-surface-container-low text-xs text-on-surface-variant leading-relaxed">
            {services.smsBridge.getArchitectureNotice()}
          </div>

          <div>
            <label className="block text-xs font-semibold text-on-surface mb-1">
              Test portable <code>parseBankSmsText()</code> parser
            </label>
            <textarea
              rows={3}
              value={sampleSms}
              onChange={(e) => setSampleSms(e.target.value)}
              className="w-full p-3 rounded-xl bg-surface-container-low text-xs text-on-surface focus:outline-none resize-none"
            />
          </div>

          <div className="p-3.5 rounded-xl bg-surface-container text-xs flex flex-col gap-1.5">
            <div className="flex justify-between">
              <span className="text-on-surface-variant">Matched:</span>
              <span className="font-semibold text-on-surface">
                {parsedSmsPreview.matched ? 'Yes' : 'No'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-on-surface-variant">Merchant:</span>
              <span className="font-semibold text-on-surface">{parsedSmsPreview.merchant || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-on-surface-variant">Amount / Type:</span>
              <span className="font-semibold text-on-surface tabular-nums">
                {parsedSmsPreview.amount} ({parsedSmsPreview.type})
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-on-surface-variant">Auto Category:</span>
              <span className="font-semibold text-primary">
                {parsedSmsPreview.suggestedCategory}
              </span>
            </div>
          </div>

          {parsedSmsPreview.matched && (
            <button
              type="button"
              onClick={() => {
                void addTransaction({
                  title: parsedSmsPreview.merchant,
                  amount: parsedSmsPreview.amount,
                  type: parsedSmsPreview.type,
                  category: parsedSmsPreview.suggestedCategory,
                });
                setSmsTesterOpen(false);
              }}
              className="min-h-[44px] w-full rounded-xl bg-primary text-on-primary text-xs font-semibold"
            >
              Record Parsed Sample as Manual Entry
            </button>
          )}
        </div>
      </ModalSheet>
    </div>
  );
}
