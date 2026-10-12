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
