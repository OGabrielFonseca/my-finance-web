import type { ColumnDef } from './column';
import { toPageRequest, toTableSort } from './column';

interface Row {
  id: string;
  date: string;
  description: string;
  amount: number;
}

const columns: ColumnDef<Row>[] = [
  { field: 'date', header: 'x', type: 'date', sortField: 'transactionDate' },
  { field: 'description', header: 'x' },
  { field: 'amount', header: 'x', type: 'money' },
  { field: 'id', key: 'balance', header: 'x', sortField: false },
];

describe('toPageRequest', () => {
  const current = { page: 0, size: 20, sort: { field: 'transactionDate', direction: 'desc' as const } };

  it('calcula a página a partir de first/rows', () => {
    expect(toPageRequest({ first: 40, rows: 20, sortField: 'date', sortOrder: -1 }, columns, current)).toEqual({
      page: 2,
      size: 20,
      sort: { field: 'transactionDate', direction: 'desc' },
    });
  });

  it('usa o sortField da coluna (atributo da entidade) e não o nome do DTO', () => {
    expect(toPageRequest({ first: 0, rows: 20, sortField: 'date', sortOrder: 1 }, columns, current).sort).toEqual({
      field: 'transactionDate',
      direction: 'asc',
    });
  });

  it('coluna sem sortField ordena pelo próprio field', () => {
    expect(toPageRequest({ first: 0, rows: 50, sortField: 'description', sortOrder: 1 }, columns, current)).toEqual({
      page: 0,
      size: 50,
      sort: { field: 'description', direction: 'asc' },
    });
  });

  it('coluna com sortField false ou evento sem ordenação mantém a ordenação atual', () => {
    expect(toPageRequest({ first: 0, rows: 20, sortField: 'balance', sortOrder: 1 }, columns, current).sort).toEqual(
      current.sort,
    );
    expect(toPageRequest({ first: 0, rows: 20 }, columns, current).sort).toEqual(current.sort);
  });
});

describe('toTableSort', () => {
  it('traduz o atributo da entidade de volta para a coluna', () => {
    expect(toTableSort({ field: 'transactionDate', direction: 'desc' }, columns)).toEqual({ field: 'date', order: -1 });
  });

  it('sem ordenação', () => {
    expect(toTableSort(undefined, columns)).toEqual({ field: undefined, order: 1 });
  });
});
