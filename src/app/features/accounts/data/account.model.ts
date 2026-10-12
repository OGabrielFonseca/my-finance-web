import type { ApiResponse, ApiSchema } from '@api/api-types';
import type { LookupOption } from '@shared/crud/filter';

export type Account = ApiResponse<'AccountResponse', 'institution'>;
export type AccountSummary = ApiResponse<'AccountSummary'>;
export type AccountBalance = ApiResponse<'AccountBalanceResponse'>;
export type CreateAccountRequest = ApiSchema<'CreateAccountRequest'>;
export type UpdateAccountRequest = ApiSchema<'UpdateAccountRequest'>;
export type AccountType = Account['type'];

/** Query params de GET /accounts e /accounts/options. */
export interface AccountFilter {
  name: string;
  type: AccountType;
  archived: boolean;
}

/** O satisfies quebra a compilação se o backend adicionar ou remover um tipo. */
export const ACCOUNT_TYPES = [
  'CHECKING',
  'SAVINGS',
  'WALLET',
  'INVESTMENT',
  'OTHER',
] as const satisfies readonly AccountType[];

export function toAccountOptions(accounts: readonly AccountSummary[]): LookupOption[] {
  return accounts.map((account) => ({ value: account.id, label: account.name }));
}
