import type { ApiResponse, ApiSchema } from '@api/api-types';
import type { LocalDate } from '@shared/data/dates';

// Tipos de resposta no formato da API (o mock não importa das features).
export type AccountType = ApiSchema<'CreateAccountRequest'>['type'];
export type CategoryType = NonNullable<ApiSchema<'CreateCategoryRequest'>['type']>;
export type TransactionType = ApiSchema<'CreateTransactionRequest'>['type'];
export type TransactionStatus = ApiSchema<'UpdateTransactionRequest'>['status'];

export type User = ApiResponse<'UserResponse'>;
export type Account = ApiResponse<'AccountResponse', 'institution'>;
export type AccountSummary = ApiResponse<'AccountSummary'>;
export type AccountBalance = ApiResponse<'AccountBalanceResponse'>;
export type Category = ApiResponse<'CategoryResponse', 'parentId' | 'color' | 'icon'>;
export type CategorySummary = ApiResponse<'CategorySummary', 'parentId' | 'color' | 'icon'>;
export type TokenResponse = ApiResponse<'TokenResponse'>;

type TransactionBase = ApiResponse<
  'TransactionResponse',
  'creditCardInvoiceId' | 'installmentGroupId' | 'installmentNumber' | 'installmentTotal' | 'notes'
>;
export type Transaction = Omit<TransactionBase, 'account' | 'destinationAccount' | 'category'> & {
  account: AccountSummary;
  destinationAccount: AccountSummary | null;
  category: CategorySummary | null;
};

export interface DashboardSummary {
  month: string;
  totalBalance: number;
  income: number;
  expenses: number;
  result: number;
}

export interface CategoryExpense {
  categoryId: string;
  name: string;
  color: string | null;
  icon: string | null;
  amount: number;
  percentage: number;
}

export interface ExpensesByCategory {
  month: string;
  total: number;
  categories: CategoryExpense[];
}

/** Lançamento como fica guardado no "banco" do mock (ids em vez dos resumos). */
export interface MockTransaction {
  id: string;
  type: TransactionType;
  description: string;
  amount: number;
  date: LocalDate;
  status: TransactionStatus;
  accountId: string;
  destinationAccountId: string | null;
  categoryId: string | null;
  creditCardInvoiceId: string | null;
  installmentNumber: number | null;
  installmentTotal: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}
