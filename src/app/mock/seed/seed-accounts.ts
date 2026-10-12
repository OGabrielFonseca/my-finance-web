import type { Account } from '../mock-types';
import { seedId, seedInstant } from './seed-ids';

export const ACCOUNT_IDS = {
  checking: seedId('a', 1),
  savings: seedId('a', 2),
  wallet: seedId('a', 3),
  broker: seedId('a', 4),
  old: seedId('a', 5),
} as const;

export function seedAccounts(): Account[] {
  const base = {
    currency: 'BRL',
    archived: false,
    createdAt: seedInstant('2026-01-02'),
    updatedAt: seedInstant('2026-01-02'),
  };
  return [
    {
      ...base,
      id: ACCOUNT_IDS.checking,
      name: 'Conta Nubank',
      type: 'CHECKING',
      institution: 'Nubank',
      initialBalance: 2500,
    },
    {
      ...base,
      id: ACCOUNT_IDS.savings,
      name: 'Poupança Caixa',
      type: 'SAVINGS',
      institution: 'Caixa',
      initialBalance: 10000,
    },
    { ...base, id: ACCOUNT_IDS.wallet, name: 'Carteira', type: 'WALLET', institution: null, initialBalance: 200 },
    {
      ...base,
      id: ACCOUNT_IDS.broker,
      name: 'Corretora XP',
      type: 'INVESTMENT',
      institution: 'XP',
      initialBalance: 15000,
    },
    {
      ...base,
      id: ACCOUNT_IDS.old,
      name: 'Conta Itaú antiga',
      type: 'CHECKING',
      institution: 'Itaú',
      initialBalance: 0,
      archived: true,
    },
  ];
}
