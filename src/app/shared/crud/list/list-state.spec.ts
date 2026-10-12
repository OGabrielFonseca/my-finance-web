import { convertToParamMap } from '@angular/router';

import type { FilterField } from '../filter/filter';
import { readListState, writeListState } from './list-state';

const fields: FilterField[] = [
  { key: 'name', type: 'text', label: 'x' },
  { key: 'archived', type: 'boolean', label: 'x' },
  { key: 'period', type: 'dateRange', label: 'x', fromKey: 'from', toKey: 'to' },
];

describe('readListState', () => {
  it('lê filtros com os tipos certos, página e ordenação', () => {
    const state = readListState(
      convertToParamMap({
        name: 'nu',
        archived: 'true',
        from: '2026-10-01',
        page: '2',
        size: '50',
        sort: 'name,desc',
        other: 'x',
      }),
      fields,
    );
    expect(state).toEqual({
      filter: { name: 'nu', archived: true, from: '2026-10-01' },
      page: 2,
      size: 50,
      sort: { field: 'name', direction: 'desc' },
    });
  });

  it('ignora página e ordenação inválidas', () => {
    const state = readListState(convertToParamMap({ page: 'abc', size: '-1', sort: 'name,up' }), fields);
    expect(state).toEqual({ filter: {}, page: undefined, size: undefined, sort: undefined });
  });
});

describe('writeListState', () => {
  const defaults = { filter: { archived: false }, size: 20, sort: { field: 'name', direction: 'asc' as const } };

  it('omite o que é igual ao padrão', () => {
    expect(writeListState({ archived: false }, { page: 0, size: 20, sort: defaults.sort }, defaults)).toEqual({});
  });

  it('grava filtro, página, tamanho e ordenação diferentes do padrão', () => {
    const params = writeListState(
      { name: 'nu', archived: true },
      { page: 3, size: 50, sort: { field: 'type', direction: 'desc' } },
      defaults,
    );
    expect(params).toEqual({ name: 'nu', archived: 'true', page: 3, size: 50, sort: 'type,desc' });
  });
});
