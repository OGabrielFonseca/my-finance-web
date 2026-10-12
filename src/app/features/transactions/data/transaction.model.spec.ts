import type { Transaction } from './transaction.model';
import { readOnlyReason, statusForDate, toUpdateRequest } from './transaction.model';

const base: Transaction = {
  id: 't1',
  type: 'EXPENSE',
  description: 'Supermercado',
  amount: 120.5,
  date: '2026-10-20',
  status: 'PENDING',
  account: { id: 'a1', name: 'Conta', type: 'CHECKING' },
  destinationAccount: null,
  category: { id: 'c1', name: 'Mercado', type: 'EXPENSE', color: null, icon: null, parentId: null },
  creditCardInvoiceId: null,
  installmentGroupId: null,
  installmentNumber: null,
  installmentTotal: null,
  notes: null,
  createdAt: '',
  updatedAt: '',
};

describe('readOnlyReason', () => {
  it('lançamento de cartão é somente leitura', () => {
    expect(readOnlyReason({ ...base, creditCardInvoiceId: 'f1' }, new Set(['c1']))).toBe('card');
  });

  it('categoria fora das opções conhecidas é de sistema', () => {
    expect(readOnlyReason(base, new Set(['outra']))).toBe('system');
  });

  it('editável quando a categoria é conhecida ou ainda não carregou', () => {
    expect(readOnlyReason(base, new Set(['c1']))).toBeNull();
    expect(readOnlyReason(base, null)).toBeNull();
  });

  it('transferência (sem categoria) é editável', () => {
    expect(readOnlyReason({ ...base, type: 'TRANSFER', category: null }, new Set())).toBeNull();
  });
});

describe('toUpdateRequest', () => {
  it('copia o lançamento e aplica as mudanças', () => {
    expect(toUpdateRequest(base, { status: 'CLEARED' })).toEqual({
      description: 'Supermercado',
      amount: 120.5,
      date: '2026-10-20',
      status: 'CLEARED',
      accountId: 'a1',
      destinationAccountId: undefined,
      categoryId: 'c1',
      notes: undefined,
    });
  });

  it('transferência leva a conta de destino e não leva categoria', () => {
    const transfer: Transaction = {
      ...base,
      type: 'TRANSFER',
      category: null,
      destinationAccount: { id: 'a2', name: 'Poupança', type: 'SAVINGS' },
    };
    expect(toUpdateRequest(transfer)).toMatchObject({ destinationAccountId: 'a2', categoryId: undefined });
  });
});

describe('statusForDate', () => {
  const today = new Date(2026, 9, 12, 15, 0);

  it('hoje e passado: CLEARED; futuro: PENDING', () => {
    expect(statusForDate(new Date(2026, 9, 12, 23, 59), today)).toBe('CLEARED');
    expect(statusForDate(new Date(2026, 8, 1), today)).toBe('CLEARED');
    expect(statusForDate(new Date(2026, 9, 13), today)).toBe('PENDING');
  });
});
