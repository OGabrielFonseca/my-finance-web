import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import type { PageRequest, PageResponse } from '../../data/page';
import type { ListSource } from '../api/crud-api.service';
import type { CrudList, CrudListOptions } from './crud-list';
import { injectCrudList } from './crud-list';

interface Item {
  id: string;
}
interface Filter {
  name: string;
  archived: boolean;
}

const page = (ids: string[], totalItems = ids.length): PageResponse<Item> => ({
  items: ids.map((id) => ({ id })),
  page: 0,
  size: 20,
  totalItems,
  totalPages: 1,
});

describe('injectCrudList', () => {
  let api: ListSource<Item, Filter> & { list: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    api = { list: vi.fn(() => of(page(['a', 'b'], 42))) };
  });

  function create(options: CrudListOptions<Filter> = {}): CrudList<Item, Filter> {
    const list = TestBed.runInInjectionContext(() => injectCrudList(api, options));
    TestBed.tick();
    return list;
  }

  const lastCall = () => api.list.mock.lastCall as [Partial<Filter>, PageRequest];

  it('busca na criação com o filtro inicial, página 0 e ordenação padrão', () => {
    const list = create({ initialFilter: { archived: false }, sort: { field: 'name', direction: 'asc' } });

    expect(api.list).toHaveBeenCalledTimes(1);
    expect(lastCall()).toEqual([{ archived: false }, { page: 0, size: 20, sort: { field: 'name', direction: 'asc' } }]);
    expect(list.items().map((i) => i.id)).toEqual(['a', 'b']);
    expect(list.totalItems()).toBe(42);
    expect(list.loading()).toBe(false);
  });

  it('filtro novo volta para a página 0', () => {
    const list = create();
    list.setPage({ page: 3 });
    TestBed.tick();

    list.setFilter({ name: 'nu' });
    TestBed.tick();

    expect(lastCall()).toEqual([{ name: 'nu' }, { page: 0, size: 20, sort: undefined }]);
  });

  it('setPage com os mesmos valores não busca de novo', () => {
    const list = create();
    list.setPage({ page: 0, size: 20 });
    TestBed.tick();

    expect(api.list).toHaveBeenCalledTimes(1);
  });

  it('reload busca de novo com o mesmo estado', () => {
    const list = create();
    list.reload();

    expect(api.list).toHaveBeenCalledTimes(2);
  });

  it('erro mantém os dados anteriores', () => {
    const list = create();
    api.list.mockReturnValueOnce(throwError(() => new Error('x')));

    list.reload();

    expect(list.items().map((i) => i.id)).toEqual(['a', 'b']);
    expect(list.loading()).toBe(false);
  });
});
