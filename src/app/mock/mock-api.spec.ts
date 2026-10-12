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
