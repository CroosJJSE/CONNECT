import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  categorizeTransaction,
  computeCategorySpend,
  computeMonthlySummary,
} from '@connect-core/domain/logic/financeCategorizer';
import { formatCurrency } from '@connect-core/domain/logic/formatting';
import { parseBankSmsText } from '@connect-core/domain/logic/smsParserBridge';
import type { TransactionCategory, TransactionType } from '@connect-core/domain/models';
import { validateTransactionInput } from '@connect-core/domain/validation/validators';
import { useAuth } from '@connect-core/hooks/useAuth';
import { useConnectData } from '@connect-core/hooks/useConnectData';
import { services } from '@connect-core/services/serviceContainer';
import { Card, Chip, Field, OutlineButton, PrimaryButton } from '../components/ui';
import { colors } from '../theme';

export function FinanceScreen({ searchQuery }: { searchQuery: string }) {
  const { user } = useAuth();
  const { transactions, budgets, savingsGoals, addTransaction, deleteTransaction, contributeToGoal } =
    useConnectData();

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<TransactionType>('expense');
  const [formError, setFormError] = useState<string | null>(null);
  const [sms, setSms] = useState(
    'Your card ending 4419 was charged LKR 4,250.00 at Keells Super Havelock on 10/11.'
  );
  const [parsedHint, setParsedHint] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | TransactionType>('all');

  const currency = user?.preferredCurrency ?? 'LKR';
  const summary = useMemo(() => computeMonthlySummary(transactions), [transactions]);
  const breakdown = useMemo(
    () => computeCategorySpend(transactions, budgets),
    [transactions, budgets]
  );

  const visible = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return transactions.filter((t) => {
      if (filter !== 'all' && t.type !== filter) return false;
      if (!q) return true;
      return t.title.toLowerCase().includes(q) || (t.merchant ?? '').toLowerCase().includes(q);
    });
  }, [transactions, filter, searchQuery]);

  if (!user) return null;

  const submit = async () => {
    const value = Number(amount);
    const result = validateTransactionInput({ title, amount: value, type });
    if (!result.valid) {
      setFormError(result.errors[0] ?? 'Invalid transaction');
      return;
    }
    const { category } = categorizeTransaction(title, type);
    setFormError(null);
    await addTransaction({ title: title.trim(), amount: value, type, category });
    setTitle('');
    setAmount('');
  };

  const previewSms = () => {
    const parsed = parseBankSmsText(sms);
    if (!parsed.matched) {
      setParsedHint('No amount found in this SMS.');
      return;
    }
    setParsedHint(
      `${parsed.type} ${formatCurrency(parsed.amount, currency)} · ${parsed.merchant} · ${parsed.suggestedCategory}`
    );
  };

  const saveParsedSms = async () => {
    const parsed = parseBankSmsText(sms);
    if (!parsed.matched) {
      setParsedHint('No amount found in this SMS.');
      return;
    }
    await addTransaction({
      title: parsed.merchant,
      merchant: parsed.merchant,
      amount: parsed.amount,
      type: parsed.type,
      category: parsed.suggestedCategory as TransactionCategory,
      notes: 'Parsed from SMS preview (no inbox access)',
    });
    setParsedHint('Saved as a structured transaction. Raw SMS was not uploaded.');
  };

  return (
    <ScrollView contentContainerStyle={styles.list}>
      <Card>
        <Text style={styles.kicker}>This month</Text>
        <Text style={styles.hero}>{formatCurrency(summary.totalExpenses, currency)} spent</Text>
        <Text style={styles.meta}>Income {formatCurrency(summary.totalIncome, currency)}</Text>
      </Card>

      <Card>
        <Text style={styles.cardTitle}>Add transaction</Text>
        <Field value={title} onChangeText={setTitle} placeholder="Merchant or note" />
        <Field value={amount} onChangeText={setAmount} placeholder="Amount" />
        <View style={styles.row}>
          <Chip label="Expense" selected={type === 'expense'} onPress={() => setType('expense')} />
          <Chip label="Income" selected={type === 'income'} onPress={() => setType('income')} />
        </View>
        {formError ? <Text style={styles.error}>{formError}</Text> : null}
        <PrimaryButton label="Save" onPress={() => void submit()} />
      </Card>

      <Card>
        <Text style={styles.cardTitle}>Android SMS parser</Text>
        <Text style={styles.body}>{services.smsBridge.getArchitectureNotice()}</Text>
        <Text style={styles.meta}>
          SMS bridge supported on this device. Inbox permission is not requested until Play review.
        </Text>
        <Field value={sms} onChangeText={setSms} placeholder="Paste a bank SMS" multiline />
        {parsedHint ? <Text style={styles.meta}>{parsedHint}</Text> : null}
        <View style={styles.row}>
          <OutlineButton label="Preview parse" onPress={previewSms} />
          <OutlineButton label="Save parsed tx" onPress={() => void saveParsedSms()} />
        </View>
      </Card>

      {breakdown.slice(0, 6).map((row) => (
        <Card key={row.category}>
          <Text style={styles.cardTitle}>{row.category}</Text>
          <Text style={styles.meta}>
            {formatCurrency(row.spent, currency)}
            {row.budgetLimit ? ` / ${formatCurrency(row.budgetLimit, currency)}` : ''}
          </Text>
        </Card>
      ))}

      {savingsGoals.map((g) => (
        <Card key={g.id}>
          <Text style={styles.cardTitle}>{g.name}</Text>
          <Text style={styles.meta}>
            {formatCurrency(g.currentAmount, currency)} / {formatCurrency(g.targetAmount, currency)}
          </Text>
          <OutlineButton label="Add 1000" onPress={() => void contributeToGoal(g.id, 1000)} />
        </Card>
      ))}

      <View style={styles.row}>
        <Chip label="All" selected={filter === 'all'} onPress={() => setFilter('all')} />
        <Chip label="Expense" selected={filter === 'expense'} onPress={() => setFilter('expense')} />
        <Chip label="Income" selected={filter === 'income'} onPress={() => setFilter('income')} />
      </View>

      {visible.map((tx) => (
        <Card key={tx.id}>
          <Text style={styles.cardTitle}>{tx.title}</Text>
          <Text style={styles.meta}>
            {tx.type} · {tx.category} · {formatCurrency(tx.amount, currency)}
          </Text>
          <OutlineButton label="Delete" onPress={() => void deleteTransaction(tx.id)} />
        </Card>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, gap: 12, paddingBottom: 32 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  kicker: { fontSize: 12, fontWeight: '700', color: colors.primary },
  hero: { fontSize: 24, fontWeight: '800', color: colors.onSurface },
  cardTitle: { fontSize: 16, fontWeight: '700', color: colors.onSurface },
  meta: { fontSize: 12, color: colors.onSurfaceVariant },
  body: { fontSize: 13, color: colors.onSurfaceVariant, lineHeight: 18 },
  error: { color: colors.onErrorContainer },
});
