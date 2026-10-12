# Fase 0b.2: API mock — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Responder às chamadas `/api/v1/**` com dados fictícios em memória, no mesmo formato da `my-finance-api`, para validar o design sem o backend no ar (`npm run start:mock`).

**Architecture:** Um `HttpInterceptorFn` (`mockApiInterceptor`) entra por último na cadeia, só na configuração `mock` (via `fileReplacements` do environment), então o código do mock não vai para o bundle de produção. Ele roteia método + caminho para handlers por recurso, que leem e gravam num "banco" em memória criado a partir de um seed determinístico. Respostas de erro saem como `HttpErrorResponse` com `ProblemDetail`, para os interceptors reais tratarem como tratariam a API.

**Tech Stack:** Angular 21 (`HttpInterceptorFn`, `HttpRequest`, `HttpParams`), RxJS (`timer` para latência), Vitest.

**Spec:** `docs/superpowers/specs/2026-10-12-fundacao-e-prototipo-design.md` (seção 4)

**Sequência dos planos:** 3º de 4. Depende de `2026-10-12-fase-0a-fundacao.md` e `2026-10-12-fase-0b1-camada-base.md`. Depois: `2026-10-12-fase-0b3-telas.md`.

## Global Constraints

- Todas as regras de `2026-10-12-fase-0a-fundacao.md` continuam valendo.
- **Só `src/environments/environment.mock.ts` importa `src/app/mock/**`.** Nenhum outro arquivo do app importa o mock.
- O mock **não importa** de `src/app/features/**` (as features chegam no plano 0b3) nem de `@env/environment` (evita ciclo com `environment.mock.ts`). Pode importar `@shared/**` e `@api/**`.
- Os nomes de schema usados em `mock-types.ts` são os do `src/api/schema.d.ts` gerado na fase 0a (Task 6). Se algum nome real for diferente (anotado naquela task), ajustar aqui.
- Mensagens (`detail`) copiam os textos do backend (`my-finance-api/src/main/resources/messages/*.properties`); códigos de erro são os dos enums `*Error` do backend.
- Cálculos financeiros (saldo, totais do dashboard) existem **só no mock**, imitando o backend. O app continua sem calcular valores.
- Commits por task, em português, terminando com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

---

### Task 1: Tipos, seed, banco em memória e cálculos

**Files:**
- Create: `src/app/mock/mock-types.ts`
- Create: `src/app/mock/seed/seed-ids.ts`, `src/app/mock/seed/seed-accounts.ts`, `src/app/mock/seed/seed-categories.ts`, `src/app/mock/seed/seed-transactions.ts`
- Create: `src/app/mock/mock-db.ts`, `src/app/mock/mock-mappers.ts`, `src/app/mock/mock-finance.ts`

**Interfaces:**
- Consumes: `ApiResponse`, `ApiSchema` (`@api/api-types`); `toLocalDate`, `LocalDate`, `YearMonth` (`@shared/data/dates`).
- Produces:
  - Tipos `AccountType`, `CategoryType`, `TransactionType`, `TransactionStatus`, `User`, `Account`, `AccountSummary`, `AccountBalance`, `Category`, `CategorySummary`, `TokenResponse`, `Transaction`, `DashboardSummary`, `CategoryExpense`, `ExpensesByCategory`, `MockTransaction`
  - `seedId(group, n)`, `newId()`, `seedInstant(date)`; `ACCOUNT_IDS` (`checking`, `savings`, `wallet`, `broker`, `old`), `CATEGORY_IDS` (`salary`, `freelance`, `yields`, `housing`, `rent`, `condo`, `energy`, `food`, `groceries`, `restaurants`, `transport`, `fuel`, `rides`, `health`, `pharmacy`, `leisure`, `streaming`, `education`, `invoicePayment`)
  - `interface MockDb { today; user; accounts; categories; transactions; sessionExpired }`, `createMockDb(today?: Date): MockDb`
  - `toAccountSummary`, `toCategorySummary`, `toTransaction(db, t)`
  - `accountBalance(db, accountId)`, `dashboardSummary(db, month)`, `expensesByCategory(db, month)`

Dados do seed:
- Usuário "Gabriel" / `demo@myfinance.dev`.
- 5 contas (corrente, poupança, carteira, investimentos e uma corrente arquivada).
- 19 categorias: 3 de receita; despesas em árvore (Moradia → Aluguel, Condomínio, Energia; Alimentação → Mercado, Restaurantes; Transporte → Combustível, Aplicativos; Saúde → Farmácia; Lazer → Streaming); "Educação" arquivada; "Pagamento de fatura" de sistema.
- ~110 lançamentos no mês anterior, atual e próximo (relativos à data de hoje); datas futuras `PENDING`. No mês atual, 3 compras de cartão (`creditCardInvoiceId` preenchido); no anterior, 1 pagamento de fatura (categoria de sistema).

As regras desta task (saldo, dashboard, status pelo seed) são testadas na Task 3, pelo roteador.

- [ ] **Step 1: Tipos**

Create `src/app/mock/mock-types.ts`:
```ts
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
```

- [ ] **Step 2: Ids e seed de contas e categorias**

Create `src/app/mock/seed/seed-ids.ts`:
```ts
/**
 * Ids fixos no formato UUID para o seed: recarregar a página recria os mesmos ids, então filtros na URL continuam válidos.
 * O primeiro caractere identifica o tipo: 1 usuário, a conta, c categoria, e lançamento, f fatura.
 */
export function seedId(group: '1' | 'a' | 'c' | 'e' | 'f', n: number): string {
  return `${group}0000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
}

/** Id de registro criado durante o uso do protótipo. */
export function newId(): string {
  return crypto.randomUUID();
}

/** Instante fixo do seed (createdAt/updatedAt), derivado da data do registro. */
export function seedInstant(date: string): string {
  return `${date}T12:00:00Z`;
}
```

Create `src/app/mock/seed/seed-accounts.ts`:
```ts
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
```

Create `src/app/mock/seed/seed-categories.ts`:
```ts
import type { Category, CategoryType } from '../mock-types';
import { seedId, seedInstant } from './seed-ids';

export const CATEGORY_IDS = {
  salary: seedId('c', 1),
  freelance: seedId('c', 2),
  yields: seedId('c', 3),
  housing: seedId('c', 10),
  rent: seedId('c', 11),
  condo: seedId('c', 12),
  energy: seedId('c', 13),
  food: seedId('c', 20),
  groceries: seedId('c', 21),
  restaurants: seedId('c', 22),
  transport: seedId('c', 30),
  fuel: seedId('c', 31),
  rides: seedId('c', 32),
  health: seedId('c', 40),
  pharmacy: seedId('c', 41),
  leisure: seedId('c', 50),
  streaming: seedId('c', 51),
  education: seedId('c', 60),
  invoicePayment: seedId('c', 90),
} as const;

export function seedCategories(): Category[] {
  const at = seedInstant('2026-01-02');
  const category = (
    id: string,
    name: string,
    type: CategoryType,
    color: string,
    icon: string,
    extra: Partial<Category> = {},
  ): Category => ({
    id,
    name,
    type,
    color,
    icon,
    parentId: null,
    archived: false,
    system: false,
    createdAt: at,
    updatedAt: at,
    ...extra,
  });
  const child = (id: string, name: string, parent: Category, icon = parent.icon ?? 'pi pi-tag') =>
    category(id, name, parent.type, parent.color ?? '#64748b', icon, { parentId: parent.id });

  const housing = category(CATEGORY_IDS.housing, 'Moradia', 'EXPENSE', '#7c3aed', 'pi pi-home');
  const food = category(CATEGORY_IDS.food, 'Alimentação', 'EXPENSE', '#ea580c', 'pi pi-shopping-cart');
  const transport = category(CATEGORY_IDS.transport, 'Transporte', 'EXPENSE', '#2563eb', 'pi pi-car');
  const health = category(CATEGORY_IDS.health, 'Saúde', 'EXPENSE', '#dc2626', 'pi pi-heart');
  const leisure = category(CATEGORY_IDS.leisure, 'Lazer', 'EXPENSE', '#db2777', 'pi pi-ticket');

  return [
    category(CATEGORY_IDS.salary, 'Salário', 'INCOME', '#16a34a', 'pi pi-briefcase'),
    category(CATEGORY_IDS.freelance, 'Freelance', 'INCOME', '#0d9488', 'pi pi-desktop'),
    category(CATEGORY_IDS.yields, 'Rendimentos', 'INCOME', '#65a30d', 'pi pi-chart-line'),
    housing,
    child(CATEGORY_IDS.rent, 'Aluguel', housing, 'pi pi-building'),
    child(CATEGORY_IDS.condo, 'Condomínio', housing),
    child(CATEGORY_IDS.energy, 'Energia', housing, 'pi pi-bolt'),
    food,
    child(CATEGORY_IDS.groceries, 'Mercado', food),
    child(CATEGORY_IDS.restaurants, 'Restaurantes', food, 'pi pi-shop'),
    transport,
    child(CATEGORY_IDS.fuel, 'Combustível', transport),
    child(CATEGORY_IDS.rides, 'Aplicativos', transport, 'pi pi-mobile'),
    health,
    child(CATEGORY_IDS.pharmacy, 'Farmácia', health),
    leisure,
    child(CATEGORY_IDS.streaming, 'Streaming', leisure, 'pi pi-video'),
    category(CATEGORY_IDS.education, 'Educação', 'EXPENSE', '#0891b2', 'pi pi-book', { archived: true }),
    category(CATEGORY_IDS.invoicePayment, 'Pagamento de fatura', 'EXPENSE', '#64748b', 'pi pi-credit-card', {
      system: true,
    }),
  ];
}
```

- [ ] **Step 3: Seed de lançamentos**

Create `src/app/mock/seed/seed-transactions.ts`:
```ts
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
```

- [ ] **Step 4: Banco em memória, mapeadores e cálculos**

Create `src/app/mock/mock-db.ts`:
```ts
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
```

Create `src/app/mock/mock-mappers.ts`:
```ts
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
```

Create `src/app/mock/mock-finance.ts`:
```ts
import type { LocalDate, YearMonth } from '@shared/data/dates';
import { toLocalDate } from '@shared/data/dates';

import type { MockDb } from './mock-db';
import type {
  AccountBalance,
  CategoryExpense,
  DashboardSummary,
  ExpensesByCategory,
  MockTransaction,
} from './mock-types';

// Cálculos que, na API real, o backend faz. Existem só no mock; o app não calcula valores financeiros.

const round2 = (value: number) => Math.round(value * 100) / 100;

/** Efeito do lançamento no saldo da conta. Compras no cartão só afetam a conta quando a fatura é paga. */
function effectOn(accountId: string, t: MockTransaction): number {
  if (t.creditCardInvoiceId) return 0;
  if (t.type === 'INCOME' && t.accountId === accountId) return t.amount;
  if (t.type === 'EXPENSE' && t.accountId === accountId) return -t.amount;
  if (t.type === 'TRANSFER' && t.accountId === accountId) return -t.amount;
  if (t.type === 'TRANSFER' && t.destinationAccountId === accountId) return t.amount;
  return 0;
}

/** Saldo atual (só CLEARED) e projetado (inclui PENDING). */
export function accountBalance(db: MockDb, accountId: string): AccountBalance {
  const initial = db.accounts.find((a) => a.id === accountId)?.initialBalance ?? 0;
  let current = initial;
  let projected = initial;
  for (const t of db.transactions) {
    const effect = effectOn(accountId, t);
    projected += effect;
    if (t.status === 'CLEARED') current += effect;
  }
  return { accountId, initialBalance: initial, currentBalance: round2(current), projectedBalance: round2(projected) };
}

function isSystemCategory(db: MockDb, categoryId: string | null): boolean {
  return db.categories.some((c) => c.id === categoryId && c.system);
}

function lastDayOf(month: YearMonth): LocalDate {
  const [year, monthNumber] = month.split('-').map(Number);
  return toLocalDate(new Date(year, monthNumber, 0));
}

/**
 * Receitas e despesas do mês com PENDING e CLEARED, sem transferências e sem pagamento de fatura.
 * Saldo total: só CLEARED até o fim do mês, somando todas as contas.
 */
export function dashboardSummary(db: MockDb, month: YearMonth): DashboardSummary {
  const inMonth = db.transactions.filter((t) => t.date.startsWith(month));
  const income = inMonth.filter((t) => t.type === 'INCOME').reduce((sum, t) => sum + t.amount, 0);
  const expenses = inMonth
    .filter((t) => t.type === 'EXPENSE' && !isSystemCategory(db, t.categoryId))
    .reduce((sum, t) => sum + t.amount, 0);

  const end = lastDayOf(month);
  const totalBalance = db.accounts.reduce((sum, account) => {
    const movements = db.transactions
      .filter((t) => t.status === 'CLEARED' && t.date <= end)
      .reduce((acc, t) => acc + effectOn(account.id, t), 0);
    return sum + account.initialBalance + movements;
  }, 0);

  return {
    month,
    totalBalance: round2(totalBalance),
    income: round2(income),
    expenses: round2(expenses),
    result: round2(income - expenses),
  };
}

/** Despesas do mês agrupadas pela categoria raiz, da maior para a menor. */
export function expensesByCategory(db: MockDb, month: YearMonth): ExpensesByCategory {
  const totals = new Map<string, number>();
  for (const t of db.transactions) {
    if (t.type !== 'EXPENSE' || !t.date.startsWith(month) || isSystemCategory(db, t.categoryId)) continue;
    const category = db.categories.find((c) => c.id === t.categoryId);
    const rootId = category?.parentId ?? category?.id;
    if (rootId) totals.set(rootId, (totals.get(rootId) ?? 0) + t.amount);
  }
  const total = [...totals.values()].reduce((a, b) => a + b, 0);
  const categories: CategoryExpense[] = [...totals.entries()]
    .map(([categoryId, amount]) => {
      const root = db.categories.find((c) => c.id === categoryId);
      return {
        categoryId,
        name: root?.name ?? '?',
        color: root?.color ?? null,
        icon: root?.icon ?? null,
        amount: round2(amount),
        percentage: total ? round2((amount / total) * 100) : 0,
      };
    })
    .sort((a, b) => b.amount - a.amount);
  return { month, total: round2(total), categories };
}
```

- [ ] **Step 5: Verificar**

Run: `npm run lint && npm run build`
Expected: lint limpo e build sem erros (o mock ainda não é usado; o build só garante que compila).

- [ ] **Step 6: Commit**

```bash
git add src/app/mock
git commit -m "feat(mock): adiciona seed determinístico, banco em memória e cálculos de saldo e dashboard

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Respostas, validação, paginação e roteador

**Files:**
- Create: `src/app/mock/mock-http.ts`, `src/app/mock/mock-validation.ts`
- Create: `src/app/mock/mock-page.ts`, `src/app/mock/mock-page.spec.ts`
- Create: `src/app/mock/mock-router.ts`, `src/app/mock/mock-router.spec.ts`

**Interfaces:**
- Consumes: `MockDb` (Task 1); `FieldError`, `ProblemDetail` (`@shared/data/api-error`); `PageResponse`, `DEFAULT_PAGE_SIZE`, `MAX_PAGE_SIZE` (`@shared/data/page`).
- Produces:
  - `interface MockResult { status; body }`; `ok`, `created`, `noContent`, `problem(status, code, detail, errors?)`, `notFound`, `unauthorized`, `malformed`, `businessError(code, detail)`
  - `type Rule`; `validate(body, rules): MockResult | null`
  - `paginate(items, query, sortable, defaultSort, toResponse?)`, `contains(value, search)`, `matchesBoolean(value, param)`
  - `interface MockRequest { method; path; params; query; body }`, `type MockHandler = (req, db: MockDb) => MockResult`, `interface MockRoute { method; pattern; handler; public? }`, `matchRoute(routes, method, path)`

- [ ] **Step 1: Escrever os testes**

Create `src/app/mock/mock-page.spec.ts`:
```ts
import { HttpParams } from '@angular/common/http';
import type { ProblemDetail } from '@shared/data/api-error';
import type { PageResponse } from '@shared/data/page';

import { contains, matchesBoolean, paginate } from './mock-page';

interface Row {
  id: string;
  name: string;
  amount: number;
}

const rows: Row[] = Array.from({ length: 25 }, (_, i) => ({ id: `r${i}`, name: `Item ${i}`, amount: i * 10 }));
const sortable = { name: (r: Row) => r.name, amount: (r: Row) => r.amount };
const query = (params: Record<string, string>) => new HttpParams({ fromObject: params });

describe('paginate', () => {
  it('usa página 0, tamanho 20 e a ordenação padrão', () => {
    const result = paginate(rows, query({}), sortable, 'amount,desc');
    const body = result.body as PageResponse<Row>;
    expect(result.status).toBe(200);
    expect(body.items.length).toBe(20);
    expect(body.items[0].amount).toBe(240);
    expect([body.page, body.size, body.totalItems, body.totalPages]).toEqual([0, 20, 25, 2]);
  });

  it('respeita page, size e sort', () => {
    const body = paginate(rows, query({ page: '1', size: '10', sort: 'amount,asc' }), sortable, 'name,asc')
      .body as PageResponse<Row>;
    expect(body.items.map((r) => r.amount)).toEqual([100, 110, 120, 130, 140, 150, 160, 170, 180, 190]);
  });

  it('limita o tamanho a 100', () => {
    expect((paginate(rows, query({ size: '500' }), sortable, 'name,asc').body as PageResponse<Row>).size).toBe(100);
  });

  it('campo de ordenação desconhecido devolve 400 MALFORMED_REQUEST', () => {
    const result = paginate(rows, query({ sort: 'date,desc' }), sortable, 'name,asc');
    expect(result.status).toBe(400);
    expect((result.body as ProblemDetail).code).toBe('common.MALFORMED_REQUEST');
  });

  it('aplica o mapeamento para o formato de resposta', () => {
    const body = paginate(rows, query({ size: '1' }), sortable, 'amount,asc', (r) => r.id).body as PageResponse<string>;
    expect(body.items).toEqual(['r0']);
  });
});

describe('filtros auxiliares', () => {
  it('contains ignora maiúsculas e aceita busca vazia', () => {
    expect(contains('Mercado Pão de Açúcar', 'pão')).toBe(true);
    expect(contains('Mercado', null)).toBe(true);
    expect(contains(null, 'x')).toBe(false);
  });

  it('matchesBoolean: ausente = todos', () => {
    expect(matchesBoolean(true, null)).toBe(true);
    expect(matchesBoolean(true, 'false')).toBe(false);
    expect(matchesBoolean(false, 'false')).toBe(true);
  });
});
```

Create `src/app/mock/mock-router.spec.ts`:
```ts
import { ok } from './mock-http';
import type { MockRoute } from './mock-router';
import { matchRoute } from './mock-router';

const handler = () => ok(null);
const routes: MockRoute[] = [
  { method: 'GET', pattern: '/accounts/options', handler },
  { method: 'GET', pattern: '/accounts/:id', handler },
  { method: 'GET', pattern: '/accounts/:id/balance', handler },
  { method: 'PATCH', pattern: '/accounts/:id/archive', handler },
];

describe('matchRoute', () => {
  it('rota fixa ganha da rota com parâmetro quando vem antes', () => {
    expect(matchRoute(routes, 'GET', '/accounts/options')?.route.pattern).toBe('/accounts/options');
  });

  it('extrai os parâmetros', () => {
    const match = matchRoute(routes, 'GET', '/accounts/a1/balance');
    expect(match?.route.pattern).toBe('/accounts/:id/balance');
    expect(match?.params).toEqual({ id: 'a1' });
  });

  it('considera o método', () => {
    expect(matchRoute(routes, 'PATCH', '/accounts/a1/archive')?.params).toEqual({ id: 'a1' });
    expect(matchRoute(routes, 'DELETE', '/accounts/a1')).toBeNull();
  });

  it('caminho sem rota devolve null', () => {
    expect(matchRoute(routes, 'GET', '/budgets')).toBeNull();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test -- --watch=false`
Expected: FAIL (`./mock-page`, `./mock-http`, `./mock-router` não encontrados).

- [ ] **Step 3: Implementar**

Create `src/app/mock/mock-http.ts`:
```ts
import type { FieldError, ProblemDetail } from '@shared/data/api-error';

/** Resposta de um handler do mock: status + corpo no formato da API. */
export interface MockResult {
  status: number;
  body: unknown;
}

export const ok = (body: unknown): MockResult => ({ status: 200, body });
export const created = (body: unknown): MockResult => ({ status: 201, body });
export const noContent = (): MockResult => ({ status: 204, body: null });

export function problem(status: number, code: string, detail: string, errors?: FieldError[]): MockResult {
  const body: ProblemDetail = { status, title: '', detail, code, ...(errors ? { errors } : {}) };
  return { status, body };
}

export const notFound = (): MockResult => problem(404, 'common.RESOURCE_NOT_FOUND', 'Recurso não encontrado.');
export const unauthorized = (): MockResult => problem(401, 'common.UNAUTHORIZED', 'Autenticação necessária.');
export const malformed = (): MockResult =>
  problem(400, 'common.MALFORMED_REQUEST', 'Requisição inválida. Verifique o formato dos dados enviados.');
export const businessError = (code: string, detail: string): MockResult => problem(422, code, detail);
```

Create `src/app/mock/mock-validation.ts`:
```ts
import type { FieldError } from '@shared/data/api-error';

import type { MockResult } from './mock-http';
import { problem } from './mock-http';

/** Regras equivalentes às anotações do Bean Validation nos requests do backend. */
export type Rule = 'required' | 'positive' | { maxLength: number } | { minLength: number } | { pattern: RegExp };

const isBlank = (value: unknown) =>
  value === null || value === undefined || (typeof value === 'string' && !value.trim());

function check(value: unknown, rule: Rule): string | null {
  if (rule === 'required') return isBlank(value) ? 'não deve estar em branco' : null;
  if (rule === 'positive') return typeof value === 'number' && value <= 0 ? 'deve ser maior que 0' : null;
  if (typeof value !== 'string' || value === '') return null;
  if ('maxLength' in rule && value.length > rule.maxLength) return `tamanho deve ser entre 0 e ${rule.maxLength}`;
  if ('minLength' in rule && value.length < rule.minLength) return `tamanho deve ser no mínimo ${rule.minLength}`;
  if ('pattern' in rule && !rule.pattern.test(value)) return `deve corresponder a "${rule.pattern.source}"`;
  return null;
}

/** Devolve 400 common.VALIDATION_ERROR com os erros de campo, ou null se estiver tudo certo. */
export function validate(body: unknown, rules: Record<string, Rule[]>): MockResult | null {
  const data = (body ?? {}) as Record<string, unknown>;
  const errors: FieldError[] = [];
  for (const [field, fieldRules] of Object.entries(rules)) {
    for (const rule of fieldRules) {
      const message = check(data[field], rule);
      if (message) {
        errors.push({ field, message });
        break;
      }
    }
  }
  return errors.length ? problem(400, 'common.VALIDATION_ERROR', 'Dados inválidos.', errors) : null;
}
```

Create `src/app/mock/mock-page.ts`:
```ts
import type { HttpParams } from '@angular/common/http';
import type { PageResponse } from '@shared/data/page';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '@shared/data/page';

import type { MockResult } from './mock-http';
import { malformed, ok } from './mock-http';

export type SortAccessor<T> = (item: T) => string | number;

/**
 * Ordena e pagina como o Spring Data: ?page (0), ?size (20, máx. 100), ?sort=campo,dir com o nome do atributo da
 * entidade. Campo de ordenação desconhecido → 400 MALFORMED_REQUEST, como na API.
 */
export function paginate<T, R = T>(
  items: readonly T[],
  query: HttpParams,
  sortable: Record<string, SortAccessor<T>>,
  defaultSort: string,
  toResponse: (item: T) => R = (item) => item as unknown as R,
): MockResult {
  const [field, direction = 'asc'] = (query.get('sort') ?? defaultSort).split(',');
  const accessor = sortable[field];
  if (!accessor || (direction !== 'asc' && direction !== 'desc')) return malformed();

  const size = Math.min(
    Math.max(Number(query.get('size') ?? DEFAULT_PAGE_SIZE) || DEFAULT_PAGE_SIZE, 1),
    MAX_PAGE_SIZE,
  );
  const page = Math.max(Number(query.get('page') ?? 0) || 0, 0);
  const factor = direction === 'desc' ? -1 : 1;
  const sorted = [...items].sort((a, b) => factor * compare(accessor(a), accessor(b)));

  const response: PageResponse<R> = {
    items: sorted.slice(page * size, page * size + size).map(toResponse),
    page,
    size,
    totalItems: items.length,
    totalPages: Math.ceil(items.length / size),
  };
  return ok(response);
}

function compare(a: string | number, b: string | number): number {
  return typeof a === 'number' && typeof b === 'number' ? a - b : String(a).localeCompare(String(b), 'pt-BR');
}

/** Filtro de texto "contém", sem diferenciar maiúsculas. */
export function contains(value: string | null | undefined, search: string | null): boolean {
  return !search || (value ?? '').toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR'));
}

/** Filtro booleano opcional (?archived=true|false; ausente = todos). */
export function matchesBoolean(value: boolean, param: string | null): boolean {
  return param === null || value === (param === 'true');
}
```

Create `src/app/mock/mock-router.ts`:
```ts
import type { HttpParams } from '@angular/common/http';

import type { MockDb } from './mock-db';
import type { MockResult } from './mock-http';

export interface MockRequest {
  method: string;
  path: string; // sem o prefixo /api/v1 e sem query string
  params: Record<string, string>; // parâmetros de rota (:id)
  query: HttpParams;
  body: unknown;
}

export type MockHandler = (req: MockRequest, db: MockDb) => MockResult;

export interface MockRoute {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  pattern: string; // ex.: '/accounts/:id/balance'
  handler: MockHandler;
  public?: boolean; // não exige Authorization (login, cadastro)
}

/** Primeira rota que casa com o método e o caminho. Declare rotas fixas (/options) antes das com :id. */
export function matchRoute(
  routes: readonly MockRoute[],
  method: string,
  path: string,
): { route: MockRoute; params: Record<string, string> } | null {
  const segments = path.split('/').filter(Boolean);
  for (const route of routes) {
    if (route.method !== method) continue;
    const pattern = route.pattern.split('/').filter(Boolean);
    if (pattern.length !== segments.length) continue;
    const params: Record<string, string> = {};
    const matches = pattern.every((part, i) => {
      if (part.startsWith(':')) {
        params[part.slice(1)] = decodeURIComponent(segments[i]);
        return true;
      }
      return part === segments[i];
    });
    if (matches) return { route, params };
  }
  return null;
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test -- --watch=false`
Expected: PASS (mock-page 7, mock-router 4).

- [ ] **Step 5: Commit**

```bash
git add src/app/mock
git commit -m "feat(mock): adiciona respostas, validação, paginação e roteador da API mock

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Handlers e `mockApiInterceptor`

**Files:**
- Create: `src/app/mock/handlers/auth.handler.ts`, `src/app/mock/handlers/accounts.handler.ts`, `src/app/mock/handlers/categories.handler.ts`, `src/app/mock/handlers/transactions.handler.ts`, `src/app/mock/handlers/dashboard.handler.ts`
- Create: `src/app/mock/mock-api.interceptor.ts`, `src/app/mock/mock-api.spec.ts`

**Interfaces:**
- Consumes: tudo das Tasks 1 e 2.
- Produces:
  - `authRoutes`, `accountRoutes`, `categoryRoutes`, `transactionRoutes`, `dashboardRoutes`
  - `MOCK_API_PREFIX = '/api/v1'`, `mockApiInterceptor: HttpInterceptorFn`, `handleMockRequest(req, db): MockResult`
  - Rota extra só do mock: `POST /api/v1/__mock/expire-session` (usada pelo botão "Expirar sessão" no plano 0b3)

Rotas atendidas (as fixas vêm antes das com `:id`):

| Recurso | Rotas |
|---|---|
| Auth | `POST /auth/login`, `POST /auth/register` (públicas), `GET/PUT /me`, `POST /__mock/expire-session` |
| Contas | `GET /accounts`, `GET /accounts/options`, `GET /accounts/:id`, `GET /accounts/:id/balance`, `POST /accounts`, `PUT /accounts/:id`, `PATCH /accounts/:id/archive` |
| Categorias | `GET /categories` (inclui a de sistema), `GET /categories/options` (sem a de sistema), `POST /categories`, `PUT /categories/:id`, `PATCH /categories/:id/archive` |
| Lançamentos | `GET /transactions`, `GET /transactions/:id`, `POST /transactions/transfers`, `POST /transactions`, `PUT /transactions/:id`, `DELETE /transactions/:id` |
| Dashboard | `GET /dashboard/summary?month=`, `GET /dashboard/expenses-by-category?month=` |

Gatilhos (spec §4.5): senha `errada` → 401; `#409`/`#500` em qualquer campo do corpo → 409/500; `#lento` no filtro de descrição → 3 s de latência; `__mock/expire-session` → a próxima chamada autenticada devolve 401.

- [ ] **Step 1: Escrever o teste**

Create `src/app/mock/mock-api.spec.ts`:
```ts
import { HttpHeaders, HttpParams, HttpRequest } from '@angular/common/http';
import type { ProblemDetail } from '@shared/data/api-error';
import type { PageResponse } from '@shared/data/page';

import { handleMockRequest } from './mock-api.interceptor';
import type { MockDb } from './mock-db';
import { createMockDb } from './mock-db';
import type { MockResult } from './mock-http';
import type {
  Account,
  AccountBalance,
  CategorySummary,
  DashboardSummary,
  MockTransaction,
  Transaction,
} from './mock-types';
import { ACCOUNT_IDS } from './seed/seed-accounts';
import { CATEGORY_IDS } from './seed/seed-categories';

const TODAY = new Date(2026, 9, 12);
const auth = new HttpHeaders({ Authorization: 'Bearer mock-token' });

function call(
  db: MockDb,
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  url: string,
  options: { body?: unknown; query?: Record<string, string>; headers?: HttpHeaders } = {},
): MockResult {
  const params = new HttpParams({ fromObject: options.query ?? {} });
  const init = { headers: options.headers ?? auth, params };
  const req =
    method === 'GET' || method === 'DELETE'
      ? new HttpRequest(method, `/api/v1${url}`, init)
      : new HttpRequest(method, `/api/v1${url}`, options.body ?? null, init);
  return handleMockRequest(req, db);
}

const code = (result: MockResult) => (result.body as ProblemDetail).code;

function tx(partial: Partial<MockTransaction>): MockTransaction {
  return {
    id: crypto.randomUUID(),
    type: 'EXPENSE',
    description: 'x',
    amount: 10,
    date: '2026-10-01',
    status: 'CLEARED',
    accountId: ACCOUNT_IDS.checking,
    destinationAccountId: null,
    categoryId: CATEGORY_IDS.groceries,
    creditCardInvoiceId: null,
    installmentNumber: null,
    installmentTotal: null,
    notes: null,
    createdAt: '2026-10-01T12:00:00Z',
    updatedAt: '2026-10-01T12:00:00Z',
    ...partial,
  };
}

describe('API mock', () => {
  let db: MockDb;

  beforeEach(() => {
    db = createMockDb(TODAY);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  describe('autenticação', () => {
    it('rota protegida sem Authorization devolve 401', () => {
      expect(call(db, 'GET', '/accounts', { headers: new HttpHeaders() }).status).toBe(401);
    });

    it('login aceita qualquer credencial, menos a senha "errada"', () => {
      const body = { email: 'a@b.com', password: '12345678' };
      expect(call(db, 'POST', '/auth/login', { body, headers: new HttpHeaders() }).status).toBe(200);
      const wrong = call(db, 'POST', '/auth/login', {
        body: { ...body, password: 'errada' },
        headers: new HttpHeaders(),
      });
      expect([wrong.status, code(wrong)]).toEqual([401, 'auth.INVALID_CREDENTIALS']);
    });

    it('expirar sessão faz a próxima chamada devolver 401 uma vez', () => {
      call(db, 'POST', '/__mock/expire-session');
      expect(call(db, 'GET', '/me').status).toBe(401);
      expect(call(db, 'GET', '/me').status).toBe(200);
    });
  });

  describe('gatilhos e rotas', () => {
    it('#409 no corpo devolve 409 DATA_CONFLICT', () => {
      const result = call(db, 'POST', '/accounts', { body: { name: 'Conta #409', type: 'CHECKING' } });
      expect([result.status, code(result)]).toEqual([409, 'common.DATA_CONFLICT']);
    });

    it('#500 no corpo devolve 500', () => {
      expect(call(db, 'POST', '/accounts', { body: { name: 'Conta #500', type: 'CHECKING' } }).status).toBe(500);
    });

    it('rota não mapeada devolve 404 e avisa no console', () => {
      expect(call(db, 'GET', '/budgets').status).toBe(404);
      expect(console.warn).toHaveBeenCalled();
    });
  });

  describe('contas', () => {
    it('filtra por arquivadas', () => {
      const all = call(db, 'GET', '/accounts').body as PageResponse<Account>;
      const active = call(db, 'GET', '/accounts', { query: { archived: 'false' } }).body as PageResponse<Account>;
      expect([all.totalItems, active.totalItems]).toEqual([5, 4]);
    });

    it('validação devolve 400 com erros de campo', () => {
      const result = call(db, 'POST', '/accounts', { body: { name: '', type: 'CHECKING' } });
      expect(code(result)).toBe('common.VALIDATION_ERROR');
      expect((result.body as ProblemDetail).errors).toEqual([{ field: 'name', message: 'não deve estar em branco' }]);
    });

    it('saldo atual só com CLEARED; projetado com PENDING; cartão não afeta a conta', () => {
      db.transactions = [
        tx({ type: 'INCOME', amount: 100, categoryId: CATEGORY_IDS.salary }),
        tx({ amount: 30, status: 'PENDING', date: '2026-10-20' }),
        tx({ amount: 50, creditCardInvoiceId: 'f1' }),
        tx({ type: 'TRANSFER', amount: 20, categoryId: null, destinationAccountId: ACCOUNT_IDS.savings }),
      ];
      const balance = call(db, 'GET', `/accounts/${ACCOUNT_IDS.checking}/balance`).body as AccountBalance;
      expect(balance).toEqual({
        accountId: ACCOUNT_IDS.checking,
        initialBalance: 2500,
        currentBalance: 2580,
        projectedBalance: 2550,
      });
    });
  });

  describe('categorias', () => {
    it('/options não traz a categoria de sistema', () => {
      const options = call(db, 'GET', '/categories/options', { query: { size: '100' } })
        .body as PageResponse<CategorySummary>;
      expect(options.items.some((c) => c.id === CATEGORY_IDS.invoicePayment)).toBe(false);
      expect(options.items.length).toBe(18);
    });

    it('subcategoria de subcategoria é recusada', () => {
      const result = call(db, 'POST', '/categories', { body: { name: 'Feira', parentId: CATEGORY_IDS.groceries } });
      expect(code(result)).toBe('category.SUBCATEGORY_DEPTH_EXCEEDED');
    });

    it('subcategoria herda o tipo do pai', () => {
      const result = call(db, 'POST', '/categories', { body: { name: 'Padaria', parentId: CATEGORY_IDS.food } });
      expect(result.status).toBe(201);
      expect((result.body as { type: string }).type).toBe('EXPENSE');
    });

    it('nome repetido no mesmo nível é recusado', () => {
      expect(code(call(db, 'POST', '/categories', { body: { name: 'mercado', parentId: CATEGORY_IDS.food } }))).toBe(
        'category.NAME_ALREADY_EXISTS',
      );
    });
  });

  describe('lançamentos', () => {
    it('lista do mais recente para o mais antigo e filtra por período', () => {
      const page = call(db, 'GET', '/transactions', {
        query: { from: '2026-10-01', to: '2026-10-31', size: '100' },
      }).body as PageResponse<Transaction>;
      const dates = page.items.map((t) => t.date);
      expect(dates.every((d) => d.startsWith('2026-10'))).toBe(true);
      expect(dates).toEqual([...dates].sort().reverse());
    });

    it('datas futuras do seed ficam pendentes', () => {
      const future = db.transactions.filter((t) => t.date > '2026-10-12');
      expect(future.length).toBeGreaterThan(0);
      expect(future.every((t) => t.status === 'PENDING')).toBe(true);
    });

    it('transferência para a mesma conta é recusada', () => {
      const body = {
        fromAccountId: ACCOUNT_IDS.checking,
        toAccountId: ACCOUNT_IDS.checking,
        description: 'x',
        amount: 10,
        date: '2026-10-12',
      };
      expect(code(call(db, 'POST', '/transactions/transfers', { body }))).toBe('transaction.TRANSFER_SAME_ACCOUNT');
    });

    it('categoria de outro tipo é recusada', () => {
      const body = {
        type: 'INCOME',
        description: 'x',
        amount: 10,
        date: '2026-10-12',
        accountId: ACCOUNT_IDS.checking,
        categoryId: CATEGORY_IDS.groceries,
      };
      expect(code(call(db, 'POST', '/transactions', { body }))).toBe('transaction.CATEGORY_TYPE_MISMATCH');
    });

    it('lançamento de cartão não é editado nem excluído pelo extrato', () => {
      const card = db.transactions.find((t) => t.creditCardInvoiceId);
      expect(code(call(db, 'DELETE', `/transactions/${card?.id}`))).toBe('transaction.CREDIT_CARD_TRANSACTION');
    });

    it('efetivar = PUT com status CLEARED', () => {
      const pending = db.transactions.find(
        (t) => t.status === 'PENDING' && t.type === 'EXPENSE' && !t.creditCardInvoiceId,
      );
      const body = { ...pending, status: 'CLEARED' };
      const result = call(db, 'PUT', `/transactions/${pending?.id}`, { body });
      expect(result.status).toBe(200);
      expect((result.body as Transaction).status).toBe('CLEARED');
    });
  });

  describe('dashboard', () => {
    it('despesas do mês sem transferências e sem pagamento de fatura', () => {
      db.transactions = [
        tx({ type: 'INCOME', amount: 1000, categoryId: CATEGORY_IDS.salary }),
        tx({ amount: 200, status: 'PENDING' }),
        tx({ amount: 999, categoryId: CATEGORY_IDS.invoicePayment }),
        tx({ type: 'TRANSFER', amount: 500, categoryId: null, destinationAccountId: ACCOUNT_IDS.savings }),
        tx({ amount: 77, date: '2026-09-30' }),
      ];
      const summary = call(db, 'GET', '/dashboard/summary', { query: { month: '2026-10' } }).body as DashboardSummary;
      expect([summary.income, summary.expenses, summary.result]).toEqual([1000, 200, 800]);
    });
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test -- --watch=false`
Expected: FAIL (`./mock-api.interceptor` não encontrado).

- [ ] **Step 3: Handlers**

Create `src/app/mock/handlers/auth.handler.ts`:
```ts
import { noContent, ok, created, problem } from '../mock-http';
import type { MockRoute } from '../mock-router';
import type { TokenResponse } from '../mock-types';
import { validate } from '../mock-validation';

const token = (): TokenResponse => ({ accessToken: 'mock-token', tokenType: 'Bearer', expiresIn: 24 * 60 * 60 });

export const authRoutes: MockRoute[] = [
  {
    method: 'POST',
    pattern: '/auth/login',
    public: true,
    handler: (req) => {
      const invalid = validate(req.body, { email: ['required'], password: ['required'] });
      if (invalid) return invalid;
      // Gatilho do protótipo: a senha "errada" simula credenciais inválidas.
      if ((req.body as { password: string }).password === 'errada') {
        return problem(401, 'auth.INVALID_CREDENTIALS', 'E-mail ou senha inválidos.');
      }
      return ok(token());
    },
  },
  {
    method: 'POST',
    pattern: '/auth/register',
    public: true,
    handler: (req, db) => {
      const invalid = validate(req.body, {
        name: ['required', { maxLength: 120 }],
        email: ['required', { maxLength: 254 }],
        password: ['required', { minLength: 8 }, { maxLength: 72 }],
      });
      if (invalid) return invalid;
      const { name, email } = req.body as { name: string; email: string };
      db.user = { ...db.user, name, email, updatedAt: new Date().toISOString() };
      return created(token());
    },
  },
  { method: 'GET', pattern: '/me', handler: (_req, db) => ok(db.user) },
  {
    method: 'PUT',
    pattern: '/me',
    handler: (req, db) => {
      const invalid = validate(req.body, { name: ['required', { maxLength: 120 }], email: ['required'] });
      if (invalid) return invalid;
      db.user = { ...db.user, ...(req.body as { name: string; email: string }), updatedAt: new Date().toISOString() };
      return ok(db.user);
    },
  },
  {
    // Só existe no mock: o botão "Expirar sessão" do menu do usuário chama esta rota.
    method: 'POST',
    pattern: '/__mock/expire-session',
    handler: (_req, db) => {
      db.sessionExpired = true;
      return noContent();
    },
  },
];
```

Create `src/app/mock/handlers/accounts.handler.ts`:
```ts
import type { MockDb } from '../mock-db';
import { accountBalance } from '../mock-finance';
import { created, noContent, notFound, ok } from '../mock-http';
import { toAccountSummary } from '../mock-mappers';
import { contains, matchesBoolean, paginate } from '../mock-page';
import type { MockRequest, MockRoute } from '../mock-router';
import type { Account } from '../mock-types';
import { validate } from '../mock-validation';
import { newId } from '../seed/seed-ids';

const sortable = {
  name: (a: Account) => a.name,
  type: (a: Account) => a.type,
  institution: (a: Account) => a.institution ?? '',
  initialBalance: (a: Account) => a.initialBalance,
  createdAt: (a: Account) => a.createdAt,
};

function filtered(req: MockRequest, db: MockDb): Account[] {
  const type = req.query.get('type');
  return db.accounts.filter(
    (a) =>
      (!type || a.type === type) &&
      matchesBoolean(a.archived, req.query.get('archived')) &&
      contains(a.name, req.query.get('name')),
  );
}

const rules = {
  name: ['required' as const, { maxLength: 100 }],
  type: ['required' as const],
  institution: [{ maxLength: 100 }],
};

export const accountRoutes: MockRoute[] = [
  {
    method: 'GET',
    pattern: '/accounts',
    handler: (req, db) => paginate(filtered(req, db), req.query, sortable, 'name,asc'),
  },
  {
    method: 'GET',
    pattern: '/accounts/options',
    handler: (req, db) => paginate(filtered(req, db), req.query, sortable, 'name,asc', toAccountSummary),
  },
  {
    method: 'GET',
    pattern: '/accounts/:id',
    handler: (req, db) => {
      const account = db.accounts.find((a) => a.id === req.params['id']);
      return account ? ok(account) : notFound();
    },
  },
  {
    method: 'GET',
    pattern: '/accounts/:id/balance',
    handler: (req, db) =>
      db.accounts.some((a) => a.id === req.params['id']) ? ok(accountBalance(db, req.params['id'])) : notFound(),
  },
  {
    method: 'POST',
    pattern: '/accounts',
    handler: (req, db) => {
      const invalid = validate(req.body, rules);
      if (invalid) return invalid;
      const body = req.body as Pick<Account, 'name' | 'type'> & { institution?: string; initialBalance?: number };
      const now = new Date().toISOString();
      const account: Account = {
        id: newId(),
        name: body.name.trim(),
        type: body.type,
        institution: body.institution?.trim() || null,
        currency: 'BRL',
        initialBalance: body.initialBalance ?? 0,
        archived: false,
        createdAt: now,
        updatedAt: now,
      };
      db.accounts.push(account);
      return created(account);
    },
  },
  {
    method: 'PUT',
    pattern: '/accounts/:id',
    handler: (req, db) => {
      const account = db.accounts.find((a) => a.id === req.params['id']);
      if (!account) return notFound();
      const invalid = validate(req.body, { ...rules, initialBalance: ['required'] });
      if (invalid) return invalid;
      const body = req.body as Pick<Account, 'name' | 'type' | 'initialBalance'> & { institution?: string };
      Object.assign(account, {
        name: body.name.trim(),
        type: body.type,
        institution: body.institution?.trim() || null,
        initialBalance: body.initialBalance,
        updatedAt: new Date().toISOString(),
      });
      return ok(account);
    },
  },
  {
    method: 'PATCH',
    pattern: '/accounts/:id/archive',
    handler: (req, db) => {
      const account = db.accounts.find((a) => a.id === req.params['id']);
      if (!account) return notFound();
      account.archived = true;
      return noContent();
    },
  },
];
```

Create `src/app/mock/handlers/categories.handler.ts`:
```ts
import type { MockDb } from '../mock-db';
import { businessError, created, noContent, notFound, ok } from '../mock-http';
import { toCategorySummary } from '../mock-mappers';
import { contains, matchesBoolean, paginate } from '../mock-page';
import type { MockRequest, MockRoute } from '../mock-router';
import type { Category, CategoryType } from '../mock-types';
import type { Rule } from '../mock-validation';
import { validate } from '../mock-validation';
import { newId } from '../seed/seed-ids';

const sortable = { name: (c: Category) => c.name, type: (c: Category) => c.type };
const TYPE_LABEL: Record<CategoryType, string> = { INCOME: 'receita', EXPENSE: 'despesa' };

const rules: Record<string, Rule[]> = {
  name: ['required', { maxLength: 60 }],
  color: [{ pattern: /^#[0-9A-Fa-f]{6}$/ }],
  icon: [{ maxLength: 50 }],
};

function filtered(req: MockRequest, db: MockDb, includeSystem: boolean): Category[] {
  const type = req.query.get('type');
  return db.categories.filter(
    (c) =>
      (includeSystem || !c.system) &&
      (!type || c.type === type) &&
      matchesBoolean(c.archived, req.query.get('archived')) &&
      contains(c.name, req.query.get('name')),
  );
}

function duplicated(db: MockDb, name: string, type: CategoryType, parentId: string | null, ignoreId?: string) {
  const normalized = name.trim().toLocaleLowerCase('pt-BR');
  return db.categories.some(
    (c) =>
      c.id !== ignoreId &&
      c.type === type &&
      c.parentId === parentId &&
      c.name.toLocaleLowerCase('pt-BR') === normalized,
  );
}

const nameExists = (name: string) =>
  businessError('category.NAME_ALREADY_EXISTS', `Já existe uma categoria com o nome ${name} neste nível.`);

export const categoryRoutes: MockRoute[] = [
  {
    method: 'GET',
    pattern: '/categories',
    handler: (req, db) => paginate(filtered(req, db, true), req.query, sortable, 'name,asc'),
  },
  {
    method: 'GET',
    pattern: '/categories/options',
    handler: (req, db) => paginate(filtered(req, db, false), req.query, sortable, 'name,asc', toCategorySummary),
  },
  {
    method: 'POST',
    pattern: '/categories',
    handler: (req, db) => {
      const invalid = validate(req.body, rules);
      if (invalid) return invalid;
      const body = req.body as { name: string; type?: CategoryType; parentId?: string; color?: string; icon?: string };
      const parent = body.parentId ? db.categories.find((c) => c.id === body.parentId) : undefined;
      if (body.parentId && !parent) return notFound();
      if (parent?.parentId) {
        return businessError(
          'category.SUBCATEGORY_DEPTH_EXCEEDED',
          'Subcategoria não pode ter subcategorias (máximo de 2 níveis).',
        );
      }
      if (parent && body.type && body.type !== parent.type) {
        return businessError(
          'category.SUBCATEGORY_TYPE_MISMATCH',
          `Subcategoria herda o tipo da categoria pai (${TYPE_LABEL[parent.type]}).`,
        );
      }
      const type = parent?.type ?? body.type;
      if (!type) return businessError('category.TYPE_REQUIRED', 'Informe o tipo da categoria (receita ou despesa).');
      if (duplicated(db, body.name, type, parent?.id ?? null)) return nameExists(body.name.trim());

      const now = new Date().toISOString();
      const category: Category = {
        id: newId(),
        parentId: parent?.id ?? null,
        name: body.name.trim(),
        type,
        color: body.color ?? parent?.color ?? null,
        icon: body.icon ?? parent?.icon ?? null,
        archived: false,
        system: false,
        createdAt: now,
        updatedAt: now,
      };
      db.categories.push(category);
      return created(category);
    },
  },
  {
    method: 'PUT',
    pattern: '/categories/:id',
    handler: (req, db) => {
      const category = db.categories.find((c) => c.id === req.params['id']);
      if (!category) return notFound();
      if (category.system) {
        return businessError(
          'category.SYSTEM_CATEGORY',
          'Categoria de sistema não pode ser alterada nem usada diretamente.',
        );
      }
      const invalid = validate(req.body, rules);
      if (invalid) return invalid;
      const body = req.body as { name: string; color?: string; icon?: string };
      if (duplicated(db, body.name, category.type, category.parentId, category.id)) return nameExists(body.name.trim());
      Object.assign(category, {
        name: body.name.trim(),
        color: body.color ?? null,
        icon: body.icon ?? null,
        updatedAt: new Date().toISOString(),
      });
      return ok(category);
    },
  },
  {
    method: 'PATCH',
    pattern: '/categories/:id/archive',
    handler: (req, db) => {
      const category = db.categories.find((c) => c.id === req.params['id']);
      if (!category) return notFound();
      if (category.system) {
        return businessError(
          'category.SYSTEM_CATEGORY',
          'Categoria de sistema não pode ser alterada nem usada diretamente.',
        );
      }
      category.archived = true;
      return noContent();
    },
  },
];
```

Create `src/app/mock/handlers/transactions.handler.ts`:
```ts
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
```

Create `src/app/mock/handlers/dashboard.handler.ts`:
```ts
import { toYearMonth } from '@shared/data/dates';

import { dashboardSummary, expensesByCategory } from '../mock-finance';
import { ok } from '../mock-http';
import type { MockRoute } from '../mock-router';

export const dashboardRoutes: MockRoute[] = [
  {
    method: 'GET',
    pattern: '/dashboard/summary',
    handler: (req, db) => ok(dashboardSummary(db, req.query.get('month') ?? toYearMonth(db.today))),
  },
  {
    method: 'GET',
    pattern: '/dashboard/expenses-by-category',
    handler: (req, db) => ok(expensesByCategory(db, req.query.get('month') ?? toYearMonth(db.today))),
  },
];
```

- [ ] **Step 4: Interceptor**

Create `src/app/mock/mock-api.interceptor.ts`:
```ts
import type { HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { mergeMap, of, throwError, timer } from 'rxjs';

import { accountRoutes } from './handlers/accounts.handler';
import { authRoutes } from './handlers/auth.handler';
import { categoryRoutes } from './handlers/categories.handler';
import { dashboardRoutes } from './handlers/dashboard.handler';
import { transactionRoutes } from './handlers/transactions.handler';
import type { MockDb } from './mock-db';
import { createMockDb } from './mock-db';
import type { MockResult } from './mock-http';
import { notFound, problem, unauthorized } from './mock-http';
import type { MockRoute } from './mock-router';
import { matchRoute } from './mock-router';

/** Prefixo fixo (o mock não importa o environment para não criar ciclo com environment.mock.ts). */
export const MOCK_API_PREFIX = '/api/v1';
const LATENCY_MS = 300;
const SLOW_LATENCY_MS = 3000;

const ROUTES: readonly MockRoute[] = [
  ...authRoutes,
  ...accountRoutes,
  ...categoryRoutes,
  ...transactionRoutes,
  ...dashboardRoutes,
];

let db: MockDb | undefined;

/** Responde às chamadas /api/v1/** com dados em memória, no mesmo formato da API. Só na configuração "mock". */
export const mockApiInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(MOCK_API_PREFIX)) return next(req);
  db ??= createMockDb();
  const result = handleMockRequest(req, db);
  const latency = req.params.get('description')?.includes('#lento') ? SLOW_LATENCY_MS : LATENCY_MS;
  return timer(latency).pipe(
    mergeMap(() =>
      result.status >= 400
        ? throwError(
            () =>
              new HttpErrorResponse({ status: result.status, error: result.body, url: req.url, statusText: 'Mock' }),
          )
        : of(new HttpResponse({ status: result.status, body: result.body, url: req.url })),
    ),
  );
};

/** Roteia a requisição para o handler (exportado para os testes). */
export function handleMockRequest(req: HttpRequest<unknown>, database: MockDb): MockResult {
  const path = req.url.slice(MOCK_API_PREFIX.length).split('?')[0];

  // Gatilhos para validar a UI de erro (seção 4.5 do spec).
  const body = JSON.stringify(req.body ?? '');
  if (body.includes('#500'))
    return problem(500, 'common.INTERNAL_ERROR', 'Erro inesperado. Tente novamente mais tarde.');
  if (body.includes('#409')) return problem(409, 'common.DATA_CONFLICT', 'Operação conflita com dados já existentes.');

  const match = matchRoute(ROUTES, req.method, path);
  if (!match) {
    console.warn('[mock] rota não mapeada:', req.method, path);
    return notFound();
  }
  if (!match.route.public) {
    if (!req.headers.has('Authorization')) return unauthorized();
    if (database.sessionExpired) {
      database.sessionExpired = false;
      return unauthorized();
    }
  }
  return match.route.handler(
    { method: req.method, path, params: match.params, query: req.params, body: req.body },
    database,
  );
}
```

- [ ] **Step 5: Rodar e ver passar**

Run: `npm test -- --watch=false`
Expected: PASS (mock-api 20, além dos anteriores).

- [ ] **Step 6: Commit**

```bash
git add src/app/mock
git commit -m "feat(mock): adiciona handlers de auth, contas, categorias, lançamentos e dashboard

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Configuração `mock` e isolamento do build

**Files:**
- Create: `src/environments/environment.mock.ts`
- Modify: `src/environments/environment.ts`, `src/app/app.config.ts`, `angular.json`, `package.json`

**Interfaces:**
- Consumes: `mockApiInterceptor` (Task 3).
- Produces: `environment.mockInterceptors: HttpInterceptorFn[]` (vazio fora do mock); configuração `mock` de build/serve; script `npm run start:mock`.

- [ ] **Step 1: Environments**

Replace `src/environments/environment.ts`:
```ts
import type { HttpInterceptorFn } from '@angular/common/http';

export const environment = {
  apiUrl: '/api/v1',
  useMockApi: false,
  /** Interceptors extras; só a configuração "mock" preenche (ver environment.mock.ts). */
  mockInterceptors: [] as HttpInterceptorFn[],
};
```

Create `src/environments/environment.mock.ts`:
```ts
import type { HttpInterceptorFn } from '@angular/common/http';

import { mockApiInterceptor } from '../app/mock/mock-api.interceptor';

/** Usado só em `npm run start:mock` (fileReplacements). É o único arquivo que importa o código do mock. */
export const environment = {
  apiUrl: '/api/v1',
  useMockApi: true,
  mockInterceptors: [mockApiInterceptor] as HttpInterceptorFn[],
};
```

- [ ] **Step 2: Interceptor do mock por último na cadeia**

Replace `src/app/app.config.ts`:
```ts
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import type { ApplicationConfig } from '@angular/core';
import { provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { providePrimeNG } from 'primeng/config';
import { DialogService } from 'primeng/dynamicdialog';

import { environment } from '@env/environment';

import { routes } from './app.routes';
import { authInterceptor } from './core/auth/auth.interceptor';
import { provideAuth } from './core/auth/auth.providers';
import { errorInterceptor } from './core/http/error.interceptor';
import { languageInterceptor } from './core/http/language.interceptor';
import { provideI18n } from './core/i18n/i18n.providers';
import { MyFinancePreset } from './core/theme/my-finance.preset';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(
      withFetch(),
      withInterceptors([authInterceptor, languageInterceptor, errorInterceptor, ...environment.mockInterceptors]),
    ),
    providePrimeNG({
      theme: {
        preset: MyFinancePreset,
        options: {
          darkModeSelector: '.app-dark',
          cssLayer: { name: 'primeng', order: 'theme, base, primeng' },
        },
      },
      ripple: false,
    }),
    MessageService,
    ConfirmationService,
    DialogService,
    ...provideI18n(),
    provideAuth(),
  ],
};
```

- [ ] **Step 3: Configuração `mock` no `angular.json`**

Em `projects.my-finance-web.architect.build.configurations`, adicionar:
```json
"mock": {
  "fileReplacements": [
    { "replace": "src/environments/environment.ts", "with": "src/environments/environment.mock.ts" }
  ],
  "optimization": false,
  "extractLicenses": false,
  "sourceMap": true
}
```

Em `projects.my-finance-web.architect.serve.configurations`, adicionar:
```json
"mock": { "buildTarget": "my-finance-web:build:mock" }
```

Em `package.json` → `scripts`:
```json
"start:mock": "ng serve --configuration mock"
```

- [ ] **Step 4: Verificar o isolamento**

Run:
```bash
npm run lint && npm test -- --watch=false
npm run build
grep -rl "__mock/expire-session" dist/my-finance-web/browser || echo "OK: mock fora do build de produção"
npx ng build --configuration mock
grep -c "__mock/expire-session" dist/my-finance-web/browser/main.js
```
Expected: lint e testes passam; o primeiro `grep` imprime `OK: mock fora do build de produção`; o segundo imprime um número maior que 0.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(mock): adiciona configuração mock com API falsa fora do build de produção

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
