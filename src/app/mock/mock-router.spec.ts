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
