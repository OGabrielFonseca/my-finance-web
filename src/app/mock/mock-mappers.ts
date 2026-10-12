import type { MockDb } from './mock-db';
import type { Account, AccountSummary, Category, CategorySummary, MockTransaction, Transaction } from './mock-types';

export function toAccountSummary(account: Account): AccountSummary {
  return { id: account.id, name: account.name, type: account.type };
}

export function toCategorySummary(category: Category): CategorySummary {
  return {
    id: category.id,
    name: category.name,
    type: category.type,
    color: category.color,
    icon: category.icon,
    parentId: category.parentId,
  };
}

export function toTransaction(db: MockDb, t: MockTransaction): Transaction {
  const account = db.accounts.find((a) => a.id === t.accountId);
  const destination = db.accounts.find((a) => a.id === t.destinationAccountId);
  const category = db.categories.find((c) => c.id === t.categoryId);
  return {
    id: t.id,
    type: t.type,
    description: t.description,
    amount: t.amount,
    date: t.date,
    status: t.status,
    account: account ? toAccountSummary(account) : { id: t.accountId, name: '?', type: 'OTHER' },
    destinationAccount: destination ? toAccountSummary(destination) : null,
    category: category ? toCategorySummary(category) : null,
    creditCardInvoiceId: t.creditCardInvoiceId,
    installmentGroupId: t.installmentTotal ? `${t.id}-group` : null,
    installmentNumber: t.installmentNumber,
    installmentTotal: t.installmentTotal,
    notes: t.notes,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  };
}
