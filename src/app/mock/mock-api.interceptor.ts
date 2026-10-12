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
