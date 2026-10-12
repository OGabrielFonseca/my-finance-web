import type { AccountSummary } from '@features/accounts';
import type { CategorySummary } from '@features/categories';
import type { LocalDate } from '@shared/data/dates';
import { toLocalDate } from '@shared/data/dates';

export const TRANSACTION_TYPES = ['INCOME', 'EXPENSE', 'TRANSFER'] as const;
export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export const TRANSACTION_STATUSES = ['PENDING', 'CLEARED'] as const;
export type TransactionStatus = (typeof TRANSACTION_STATUSES)[number];

/** Lançamento como a API devolve (conta, destino e categoria vêm resumidos). */
export interface Transaction {
  id: string;
  type: TransactionType;
  description: string;
  amount: number;
  date: LocalDate;
  status: TransactionStatus;
  account: AccountSummary;
  destinationAccount: AccountSummary | null;
  category: CategorySummary | null;
  creditCardInvoiceId: string | null;
  installmentGroupId: string | null;
  installmentNumber: number | null;
  installmentTotal: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTransactionRequest {
  type: TransactionType;
  description: string;
  amount: number;
  date: LocalDate;
  status?: TransactionStatus;
  accountId: string;
  categoryId: string;
  notes?: string;
}

export interface UpdateTransactionRequest {
  description: string;
  amount: number;
  date: LocalDate;
  status: TransactionStatus;
  accountId: string;
  destinationAccountId?: string;
  categoryId?: string;
  notes?: string;
}

export interface CreateTransferRequest {
  fromAccountId: string;
  toAccountId: string;
  description: string;
  amount: number;
  date: LocalDate;
  status?: TransactionStatus;
  notes?: string;
}

/** Query params de GET /transactions. */
export interface TransactionFilter {
  from: LocalDate;
  to: LocalDate;
  accountId: string;
  categoryId: string;
  creditCardInvoiceId: string;
  type: TransactionType;
  status: TransactionStatus;
  description: string;
}

export type ReadOnlyReason = 'card' | 'system';

/**
 * Lançamentos de cartão e de categoria de sistema não são editados pelo extrato. O lançamento não diz se a categoria é
 * de sistema; ela é a que não aparece em /categories/options (knownCategoryIds). Enquanto as categorias não carregam
 * (null), só o cartão é considerado.
 */
export function readOnlyReason(t: Transaction, knownCategoryIds: ReadonlySet<string> | null): ReadOnlyReason | null {
  if (t.creditCardInvoiceId) return 'card';
  if (knownCategoryIds && t.category && !knownCategoryIds.has(t.category.id)) return 'system';
  return null;
}

/** Corpo do PUT a partir do lançamento atual (ex.: efetivar = mudar só o status). */
export function toUpdateRequest(
  t: Transaction,
  changes: Partial<UpdateTransactionRequest> = {},
): UpdateTransactionRequest {
  return {
    description: t.description,
    amount: t.amount,
    date: t.date,
    status: t.status,
    accountId: t.account.id,
    destinationAccountId: t.destinationAccount?.id,
    categoryId: t.category?.id,
    notes: t.notes ?? undefined,
    ...changes,
  };
}

/** Mesma regra do backend quando o status não é informado: data futura é PENDING. */
export function statusForDate(date: Date, today = new Date()): TransactionStatus {
  return toLocalDate(date) > toLocalDate(today) ? 'PENDING' : 'CLEARED';
}
