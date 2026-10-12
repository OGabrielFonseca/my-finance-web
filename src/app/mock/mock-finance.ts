import type { LocalDate, YearMonth } from '@shared/data/dates';
import { toLocalDate } from '@shared/data/dates';

import type { MockDb } from './mock-db';
import type {
  AccountBalance,
  CategoryExpense,
  DashboardSummary,
  ExpensesByCategory,
  MockTransaction,
} from './mock-types';

// Cálculos que, na API real, o backend faz. Existem só no mock; o app não calcula valores financeiros.

const round2 = (value: number) => Math.round(value * 100) / 100;

/** Efeito do lançamento no saldo da conta. Compras no cartão só afetam a conta quando a fatura é paga. */
function effectOn(accountId: string, t: MockTransaction): number {
  if (t.creditCardInvoiceId) return 0;
  if (t.type === 'INCOME' && t.accountId === accountId) return t.amount;
  if (t.type === 'EXPENSE' && t.accountId === accountId) return -t.amount;
  if (t.type === 'TRANSFER' && t.accountId === accountId) return -t.amount;
  if (t.type === 'TRANSFER' && t.destinationAccountId === accountId) return t.amount;
  return 0;
}

/** Saldo atual (só CLEARED) e projetado (inclui PENDING). */
export function accountBalance(db: MockDb, accountId: string): AccountBalance {
  const initial = db.accounts.find((a) => a.id === accountId)?.initialBalance ?? 0;
  let current = initial;
  let projected = initial;
  for (const t of db.transactions) {
    const effect = effectOn(accountId, t);
    projected += effect;
    if (t.status === 'CLEARED') current += effect;
  }
  return { accountId, initialBalance: initial, currentBalance: round2(current), projectedBalance: round2(projected) };
}

function isSystemCategory(db: MockDb, categoryId: string | null): boolean {
  return db.categories.some((c) => c.id === categoryId && c.system);
}

function lastDayOf(month: YearMonth): LocalDate {
  const [year, monthNumber] = month.split('-').map(Number);
  return toLocalDate(new Date(year, monthNumber, 0));
}

/**
 * Receitas e despesas do mês com PENDING e CLEARED, sem transferências e sem pagamento de fatura.
 * Saldo total: só CLEARED até o fim do mês, somando todas as contas.
 */
export function dashboardSummary(db: MockDb, month: YearMonth): DashboardSummary {
  const inMonth = db.transactions.filter((t) => t.date.startsWith(month));
  const income = inMonth.filter((t) => t.type === 'INCOME').reduce((sum, t) => sum + t.amount, 0);
  const expenses = inMonth
    .filter((t) => t.type === 'EXPENSE' && !isSystemCategory(db, t.categoryId))
    .reduce((sum, t) => sum + t.amount, 0);

  const end = lastDayOf(month);
  const totalBalance = db.accounts.reduce((sum, account) => {
    const movements = db.transactions
      .filter((t) => t.status === 'CLEARED' && t.date <= end)
      .reduce((acc, t) => acc + effectOn(account.id, t), 0);
    return sum + account.initialBalance + movements;
  }, 0);

  return {
    month,
    totalBalance: round2(totalBalance),
    income: round2(income),
    expenses: round2(expenses),
    result: round2(income - expenses),
  };
}

/** Despesas do mês agrupadas pela categoria raiz, da maior para a menor. */
export function expensesByCategory(db: MockDb, month: YearMonth): ExpensesByCategory {
  const totals = new Map<string, number>();
  for (const t of db.transactions) {
    if (t.type !== 'EXPENSE' || !t.date.startsWith(month) || isSystemCategory(db, t.categoryId)) continue;
    const category = db.categories.find((c) => c.id === t.categoryId);
    const rootId = category?.parentId ?? category?.id;
    if (rootId) totals.set(rootId, (totals.get(rootId) ?? 0) + t.amount);
  }
  const total = [...totals.values()].reduce((a, b) => a + b, 0);
  const categories: CategoryExpense[] = [...totals.entries()]
    .map(([categoryId, amount]) => {
      const root = db.categories.find((c) => c.id === categoryId);
      return {
        categoryId,
        name: root?.name ?? '?',
        color: root?.color ?? null,
        icon: root?.icon ?? null,
        amount: round2(amount),
        percentage: total ? round2((amount / total) * 100) : 0,
      };
    })
    .sort((a, b) => b.amount - a.amount);
  return { month, total: round2(total), categories };
}
