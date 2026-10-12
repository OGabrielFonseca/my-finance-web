import type { LocalDate } from '@shared/data/dates';
import { toLocalDate } from '@shared/data/dates';

import type { MockTransaction, TransactionType } from '../mock-types';
import { ACCOUNT_IDS } from './seed-accounts';
import { CATEGORY_IDS } from './seed-categories';
import { seedId, seedInstant } from './seed-ids';

interface Entry {
  day: number;
  type: TransactionType;
  description: string;
  amount: number;
  accountId: string;
  categoryId?: string;
  destinationAccountId?: string;
}

const C = CATEGORY_IDS;
const A = ACCOUNT_IDS;

/** Lançamentos de um mês. i (0, 1, 2) varia alguns valores entre os meses. */
function monthEntries(i: number): Entry[] {
  const pick = (values: readonly number[]) => values[i % values.length];
  const income = (
    day: number,
    description: string,
    amount: number,
    categoryId: string,
    accountId: string = A.checking,
  ) => ({ day, type: 'INCOME', description, amount, accountId, categoryId }) as const;
  const expense = (
    day: number,
    description: string,
    amount: number,
    categoryId: string,
    accountId: string = A.checking,
  ) => ({ day, type: 'EXPENSE', description, amount, accountId, categoryId }) as const;
  const transfer = (day: number, description: string, amount: number, from: string, to: string) =>
    ({ day, type: 'TRANSFER', description, amount, accountId: from, destinationAccountId: to }) as const;

  const groceries = [312.45, 98.9, 154.3, 221.75, 67.2, 189.9, 134.55, 276.1, 88.4, 143.25];
  const restaurants = [58.9, 112.4, 42, 86.5, 135.2, 64.8, 97.3, 51.6];
  const rides = [23.9, 31.5, 18.7, 27.4, 35.1, 21.8];

  return [
    income(5, 'Salário', 8500, C.salary),
    transfer(6, 'Reserva mensal', 1000, A.checking, A.savings),
    expense(10, 'Aluguel', 2200, C.rent),
    expense(12, 'Condomínio', 650, C.condo),
    expense(15, 'Conta de luz', pick([180.4, 212.9, 195.3]), C.energy),
    ...(pick([1800, 0, 2400]) ? [income(20, 'Projeto freelance', pick([1800, 0, 2400]), C.freelance)] : []),
    income(28, 'Rendimento poupança', pick([64.12, 71.9, 69.35]), C.yields, A.savings),
    transfer(24, 'Saque', 300, A.checking, A.wallet),
    expense(8, 'Streaming', 55.9, C.streaming),
    expense(17, 'Farmácia', pick([89.9, 45.3, 132.8]), C.pharmacy),
    expense(7, 'Posto de combustível', 250, C.fuel),
    expense(21, 'Posto de combustível', 230, C.fuel),
    ...groceries.map((amount, k) => expense(2 + k * 3, 'Supermercado', amount, C.groceries)),
    ...restaurants.map((amount, k) =>
      expense(3 + k * 4, 'Restaurante', amount, C.restaurants, k % 2 ? A.wallet : A.checking),
    ),
    ...rides.map((amount, k) => expense(4 + k * 5, 'Corrida por aplicativo', amount, C.rides)),
  ];
}

/** ~110 lançamentos no mês anterior, no atual e no próximo; datas futuras ficam PENDING. */
export function seedTransactions(today: Date): MockTransaction[] {
  const todayDate = toLocalDate(today);
  const transactions: MockTransaction[] = [];
  let n = 0;

  const add = (date: LocalDate, entry: Omit<Entry, 'day'>, extra: Partial<MockTransaction> = {}) => {
    transactions.push({
      id: seedId('e', ++n),
      type: entry.type,
      description: entry.description,
      amount: entry.amount,
      date,
      status: date > todayDate ? 'PENDING' : 'CLEARED',
      accountId: entry.accountId,
      destinationAccountId: entry.destinationAccountId ?? null,
      categoryId: entry.categoryId ?? null,
      creditCardInvoiceId: null,
      installmentNumber: null,
      installmentTotal: null,
      notes: null,
      createdAt: seedInstant(date),
      updatedAt: seedInstant(date),
      ...extra,
    });
  };

  [-1, 0, 1].forEach((offset, i) => {
    const year = today.getFullYear();
    const month = today.getMonth() + offset;
    const lastDay = new Date(year, month + 1, 0).getDate();
    const dateOf = (day: number) => toLocalDate(new Date(year, month, Math.min(day, lastDay)));

    for (const { day, ...entry } of monthEntries(i)) add(dateOf(day), entry);

    if (offset === -1) {
      // Pagamento de fatura: categoria de sistema, não editável no extrato.
      add(dateOf(15), {
        type: 'EXPENSE',
        description: 'Fatura Nubank',
        amount: 1874.35,
        accountId: A.checking,
        categoryId: C.invoicePayment,
      });
    }
    if (offset === 0) {
      // Compras no cartão: gerenciadas pela fatura, não editáveis no extrato.
      const invoice = { creditCardInvoiceId: seedId('f', 1) };
      add(
        dateOf(3),
        { type: 'EXPENSE', description: 'Notebook', amount: 1200, accountId: A.checking, categoryId: C.leisure },
        {
          ...invoice,
          installmentNumber: 1,
          installmentTotal: 3,
        },
      );
      add(
        dateOf(9),
        {
          type: 'EXPENSE',
          description: 'Mercado online',
          amount: 289.9,
          accountId: A.checking,
          categoryId: C.groceries,
        },
        invoice,
      );
      add(
        dateOf(13),
        {
          type: 'EXPENSE',
          description: 'Jantar de aniversário',
          amount: 145,
          accountId: A.checking,
          categoryId: C.restaurants,
        },
        invoice,
      );
    }
  });

  return transactions;
}
