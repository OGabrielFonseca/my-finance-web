import type { Account, Category, MockTransaction, User } from './mock-types';
import { seedAccounts } from './seed/seed-accounts';
import { seedCategories } from './seed/seed-categories';
import { seedId, seedInstant } from './seed/seed-ids';
import { seedTransactions } from './seed/seed-transactions';

/** "Banco" em memória do protótipo. Recriado a cada carga da página. */
export interface MockDb {
  today: Date;
  user: User;
  accounts: Account[];
  categories: Category[];
  transactions: MockTransaction[];
  /** Ligado pelo botão "Expirar sessão": a próxima chamada autenticada devolve 401. */
  sessionExpired: boolean;
}

export function createMockDb(today: Date = new Date()): MockDb {
  return {
    today,
    user: {
      id: seedId('1', 1),
      name: 'Gabriel',
      email: 'demo@myfinance.dev',
      createdAt: seedInstant('2026-01-02'),
      updatedAt: seedInstant('2026-01-02'),
    },
    accounts: seedAccounts(),
    categories: seedCategories(),
    transactions: seedTransactions(today),
    sessionExpired: false,
  };
}
