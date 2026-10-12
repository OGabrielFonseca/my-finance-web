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
