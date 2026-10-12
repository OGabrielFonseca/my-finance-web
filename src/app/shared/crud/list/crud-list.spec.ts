import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import type { PageRequest, PageResponse } from '../../data/page';
import type { ListSource } from '../api/crud-api.service';
import type { CrudList, CrudListOptions } from './crud-list';
import { injectCrudList } from './crud-list';
import type { FilterField } from '../filter/filter';

@Component({ template: '', changeDetection: ChangeDetectionStrategy.OnPush })
class BlankPage {}

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

const fields: FilterField[] = [
  { key: 'name', type: 'text', label: 'x' },
  { key: 'archived', type: 'boolean', label: 'x' },
];

describe('injectCrudList', () => {
  let api: ListSource<Item, Filter> & { list: ReturnType<typeof vi.fn> };
  let router: Router;

  beforeEach(() => {
    api = { list: vi.fn(() => of(page(['a', 'b'], 42))) };
    TestBed.configureTestingModule({ providers: [provideRouter([{ path: '**', component: BlankPage }])] });
    router = TestBed.inject(Router);
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

  it('lê filtro, página e ordenação da URL, por cima do filtro inicial', async () => {
    await router.navigateByUrl('/accounts?name=nu&page=2&sort=type,desc');

    create({ initialFilter: { archived: false }, filterFields: fields });

    expect(lastCall()).toEqual([
      { archived: false, name: 'nu' },
      { page: 2, size: 20, sort: { field: 'type', direction: 'desc' } },
    ]);
  });

  it('grava na URL só o que difere do padrão', async () => {
    await router.navigateByUrl('/accounts');
    const list = create({ initialFilter: { archived: false }, filterFields: fields });

    list.setFilter({ archived: true, name: 'nu' });
    TestBed.tick();

    await vi.waitFor(() => expect(router.url).toBe('/accounts?archived=true&name=nu'));
  });

  it('syncWithUrl: false não lê nem grava a URL', async () => {
    await router.navigateByUrl('/accounts?name=nu');
    const list = create({ syncWithUrl: false, filterFields: fields });

    list.setFilter({ name: 'outro' });
    TestBed.tick();
    await Promise.resolve();

    expect(lastCall()[0]).toEqual({ name: 'outro' });
    expect(router.url).toBe('/accounts?name=nu');
  });
});
