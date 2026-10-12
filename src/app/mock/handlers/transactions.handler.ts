import { toLocalDate } from '@shared/data/dates';

import type { MockDb } from '../mock-db';
import type { MockResult } from '../mock-http';
import { businessError, created, noContent, notFound, ok } from '../mock-http';
import { toTransaction } from '../mock-mappers';
import { contains, paginate } from '../mock-page';
import type { MockRequest, MockRoute } from '../mock-router';
import type { MockTransaction, TransactionStatus, TransactionType } from '../mock-types';
import type { Rule } from '../mock-validation';
import { validate } from '../mock-validation';
import { newId } from '../seed/seed-ids';

const sortable = {
  transactionDate: (t: MockTransaction) => `${t.date}|${t.createdAt}`,
  description: (t: MockTransaction) => t.description,
  amount: (t: MockTransaction) => t.amount,
  type: (t: MockTransaction) => t.type,
  status: (t: MockTransaction) => t.status,
  createdAt: (t: MockTransaction) => t.createdAt,
};

const TYPE_LABEL: Record<TransactionType, string> = {
  INCOME: 'Receita',
  EXPENSE: 'Despesa',
  TRANSFER: 'Transferência',
};

const baseRules: Record<string, Rule[]> = {
  description: ['required', { maxLength: 200 }],
  amount: ['required', 'positive'],
  date: ['required'],
  accountId: ['required'],
  notes: [{ maxLength: 2000 }],
};

function filtered(req: MockRequest, db: MockDb): MockTransaction[] {
  const q = (key: string) => req.query.get(key);
  return db.transactions.filter(
    (t) =>
      (!q('from') || t.date >= (q('from') ?? '')) &&
      (!q('to') || t.date <= (q('to') ?? '')) &&
      (!q('accountId') || t.accountId === q('accountId') || t.destinationAccountId === q('accountId')) &&
      (!q('categoryId') || t.categoryId === q('categoryId')) &&
      (!q('creditCardInvoiceId') || t.creditCardInvoiceId === q('creditCardInvoiceId')) &&
      (!q('type') || t.type === q('type')) &&
      (!q('status') || t.status === q('status')) &&
      contains(t.description, q('description')?.replace('#lento', '').trim() ?? null),
  );
}

const defaultStatus = (db: MockDb, date: string): TransactionStatus =>
  date > toLocalDate(db.today) ? 'PENDING' : 'CLEARED';

/** Regras de categoria: precisa existir, não ser de sistema nem arquivada e ter o mesmo tipo do lançamento. */
function checkCategory(db: MockDb, type: TransactionType, categoryId: string): MockResult | null {
  const category = db.categories.find((c) => c.id === categoryId);
  if (!category) return notFound();
  if (category.system) {
    return businessError(
      'category.SYSTEM_CATEGORY',
      'Categoria de sistema não pode ser alterada nem usada diretamente.',
    );
  }
  if (category.archived)
    return businessError('category.CATEGORY_ARCHIVED', 'Categoria arquivada não aceita novos lançamentos.');
  if (category.type !== type) {
    return businessError(
      'transaction.CATEGORY_TYPE_MISMATCH',
      `Categoria do tipo ${TYPE_LABEL[category.type]} não pode ser usada em lançamento do tipo ${TYPE_LABEL[type]}.`,
    );
  }
  return null;
}

/** Lançamentos de cartão e de categoria de sistema não são alterados pelo extrato. */
function checkEditable(db: MockDb, t: MockTransaction): MockResult | null {
  if (t.creditCardInvoiceId) {
    return businessError(
      'transaction.CREDIT_CARD_TRANSACTION',
      'Lançamentos de cartão são gerenciados pela fatura do cartão.',
    );
  }
  if (db.categories.some((c) => c.id === t.categoryId && c.system)) {
    return businessError(
      'transaction.SYSTEM_TRANSACTION',
      'Lançamentos gerados pela aplicação (ex.: pagamento de fatura) não podem ser alterados diretamente.',
    );
  }
  return null;
}

const sameAccount = () =>
  businessError('transaction.TRANSFER_SAME_ACCOUNT', 'Conta de origem e destino não podem ser iguais.');

function insert(db: MockDb, data: Omit<MockTransaction, 'id' | 'createdAt' | 'updatedAt'>): MockResult {
  const now = new Date().toISOString();
  const transaction: MockTransaction = { ...data, id: newId(), createdAt: now, updatedAt: now };
  db.transactions.push(transaction);
  return created(toTransaction(db, transaction));
}

const emptyLinks = { creditCardInvoiceId: null, installmentNumber: null, installmentTotal: null } as const;

export const transactionRoutes: MockRoute[] = [
  {
    method: 'GET',
    pattern: '/transactions',
    handler: (req, db) =>
      paginate(filtered(req, db), req.query, sortable, 'transactionDate,desc', (t) => toTransaction(db, t)),
  },
  {
    method: 'GET',
    pattern: '/transactions/:id',
    handler: (req, db) => {
      const t = db.transactions.find((x) => x.id === req.params['id']);
      return t ? ok(toTransaction(db, t)) : notFound();
    },
  },
  {
    method: 'POST',
    pattern: '/transactions/transfers',
    handler: (req, db) => {
      const invalid = validate(req.body, {
        ...baseRules,
        accountId: [],
        fromAccountId: ['required'],
        toAccountId: ['required'],
      });
      if (invalid) return invalid;
      const body = req.body as {
        fromAccountId: string;
        toAccountId: string;
        description: string;
        amount: number;
        date: string;
        status?: TransactionStatus;
        notes?: string;
      };
      if (body.fromAccountId === body.toAccountId) return sameAccount();
      return insert(db, {
        type: 'TRANSFER',
        description: body.description.trim(),
        amount: body.amount,
        date: body.date,
        status: body.status ?? defaultStatus(db, body.date),
        accountId: body.fromAccountId,
        destinationAccountId: body.toAccountId,
        categoryId: null,
        notes: body.notes?.trim() || null,
        ...emptyLinks,
      });
    },
  },
  {
    method: 'POST',
    pattern: '/transactions',
    handler: (req, db) => {
      const invalid = validate(req.body, { ...baseRules, type: ['required'], categoryId: ['required'] });
      if (invalid) return invalid;
      const body = req.body as {
        type: TransactionType;
        description: string;
        amount: number;
        date: string;
        status?: TransactionStatus;
        accountId: string;
        categoryId: string;
        notes?: string;
      };
      if (body.type === 'TRANSFER') {
        return businessError(
          'transaction.USE_TRANSFER_ENDPOINT',
          'Transferências devem ser criadas em /api/v1/transactions/transfers.',
        );
      }
      const categoryError = checkCategory(db, body.type, body.categoryId);
      if (categoryError) return categoryError;
      return insert(db, {
        type: body.type,
        description: body.description.trim(),
        amount: body.amount,
        date: body.date,
        status: body.status ?? defaultStatus(db, body.date),
        accountId: body.accountId,
        destinationAccountId: null,
        categoryId: body.categoryId,
        notes: body.notes?.trim() || null,
        ...emptyLinks,
      });
    },
  },
  {
    method: 'PUT',
    pattern: '/transactions/:id',
    handler: (req, db) => {
      const t = db.transactions.find((x) => x.id === req.params['id']);
      if (!t) return notFound();
      const notEditable = checkEditable(db, t);
      if (notEditable) return notEditable;
      const invalid = validate(req.body, { ...baseRules, status: ['required'] });
      if (invalid) return invalid;
      const body = req.body as {
        description: string;
        amount: number;
        date: string;
        status: TransactionStatus;
        accountId: string;
        destinationAccountId?: string | null;
        categoryId?: string | null;
        notes?: string | null;
      };
      if (t.type === 'TRANSFER') {
        if (!body.destinationAccountId) {
          return businessError(
            'transaction.TRANSFER_WITHOUT_DESTINATION',
            'Transferência precisa de uma conta de destino.',
          );
        }
        if (body.destinationAccountId === body.accountId) return sameAccount();
        if (body.categoryId)
          return businessError('transaction.TRANSFER_WITHOUT_CATEGORY', 'Transferência não tem categoria.');
      } else {
        if (body.destinationAccountId) {
          return businessError(
            'transaction.DESTINATION_ACCOUNT_ONLY_FOR_TRANSFER',
            'Conta de destino só existe em transferência.',
          );
        }
        if (!body.categoryId)
          return businessError('transaction.CATEGORY_REQUIRED', 'Receita e despesa precisam de categoria.');
        if (body.categoryId !== t.categoryId) {
          const categoryError = checkCategory(db, t.type, body.categoryId);
          if (categoryError) return categoryError;
        }
      }
      Object.assign(t, {
        description: body.description.trim(),
        amount: body.amount,
        date: body.date,
        status: body.status,
        accountId: body.accountId,
        destinationAccountId: t.type === 'TRANSFER' ? body.destinationAccountId : null,
        categoryId: t.type === 'TRANSFER' ? null : body.categoryId,
        notes: body.notes?.trim() || null,
        updatedAt: new Date().toISOString(),
      });
      return ok(toTransaction(db, t));
    },
  },
  {
    method: 'DELETE',
    pattern: '/transactions/:id',
    handler: (req, db) => {
      const t = db.transactions.find((x) => x.id === req.params['id']);
      if (!t) return notFound();
      const notEditable = checkEditable(db, t);
      if (notEditable) return notEditable;
      db.transactions = db.transactions.filter((x) => x.id !== t.id);
      return noContent();
    },
  },
];
