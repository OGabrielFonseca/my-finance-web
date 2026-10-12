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
