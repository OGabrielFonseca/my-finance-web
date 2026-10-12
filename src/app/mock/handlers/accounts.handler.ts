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
