import type { LookupOption } from '@shared/crud/filter';

export const ACCOUNT_TYPES = ['CHECKING', 'SAVINGS', 'WALLET', 'INVESTMENT', 'OTHER'] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  institution: string | null;
  currency: string;
  initialBalance: number;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AccountSummary {
  id: string;
  name: string;
  type: AccountType;
}

export interface AccountBalance {
  accountId: string;
  initialBalance: number;
  currentBalance: number;
  projectedBalance: number;
}

export interface CreateAccountRequest {
  name: string;
  type: AccountType;
  institution?: string;
  initialBalance?: number;
}

export interface UpdateAccountRequest {
  name: string;
  type: AccountType;
  institution?: string;
  initialBalance: number;
}

/** Query params de GET /accounts e /accounts/options. */
export interface AccountFilter {
  name: string;
  type: AccountType;
  archived: boolean;
}

export function toAccountOptions(accounts: readonly AccountSummary[]): LookupOption[] {
  return accounts.map((account) => ({ value: account.id, label: account.name }));
}
