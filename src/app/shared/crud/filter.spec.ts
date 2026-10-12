import { signal } from '@angular/core';

import type { FilterField } from './filter';
import { countActiveFilters, filterToForm, formToFilter, sameFilter } from './filter';

const fields: FilterField[] = [
  { key: 'description', type: 'text', label: 'f.description' },
  { key: 'type', type: 'enum', label: 'f.type', enumKey: 'transactionType', options: ['INCOME', 'EXPENSE'] },
  { key: 'archived', type: 'boolean', label: 'common.onlyArchived' },
  { key: 'period', type: 'dateRange', label: 'f.period', fromKey: 'from', toKey: 'to' },
  { key: 'accountId', type: 'lookup', label: 'f.account', options: signal([]) },
];

describe('formToFilter', () => {
  it('converte e remove vazios', () => {
    const filter = formToFilter(fields, {
      description: '  mercado ',
      type: null,
      archived: false,
      period: [new Date(2026, 9, 1), new Date(2026, 9, 31, 23, 0)],
      accountId: 'a1',
    });
    expect(filter).toEqual({
      description: 'mercado',
      archived: false,
      from: '2026-10-01',
      to: '2026-10-31',
      accountId: 'a1',
    });
  });

  it('período com só a data inicial', () => {
    expect(formToFilter(fields, { period: [new Date(2026, 9, 1), null] })).toEqual({
      archived: false,
      from: '2026-10-01',
    });
  });

  it('texto só com espaços não entra', () => {
    expect(formToFilter(fields, { description: '   ' })).toEqual({ archived: false });
  });
});

describe('filterToForm', () => {
  it('converte LocalDate em Date e preenche ausentes com null', () => {
    const form = filterToForm(fields, { from: '2026-10-01', to: '2026-10-31', archived: true });
    expect(form['description']).toBeNull();
    expect(form['archived']).toBe(true);
    const [from, to] = form['period'] as Date[];
    expect([from.getDate(), to.getDate(), to.getMonth()]).toEqual([1, 31, 9]);
  });

  it('ida e volta preserva o filtro', () => {
    const filter = {
      description: 'x',
      type: 'INCOME',
      archived: false,
      from: '2026-10-01',
      to: '2026-10-05',
      accountId: 'a1',
    };
    expect(formToFilter(fields, filterToForm(fields, filter))).toEqual(filter);
  });
});

describe('countActiveFilters', () => {
  it('conta campos diferentes do inicial (o período conta uma vez)', () => {
    const initial = { archived: false };
    expect(countActiveFilters(fields, { archived: false }, initial)).toBe(0);
    expect(
      countActiveFilters(fields, { archived: true, from: '2026-10-01', to: '2026-10-02', type: 'INCOME' }, initial),
    ).toBe(3);
  });
});

describe('sameFilter', () => {
  it('ignora ordem das chaves e valores vazios', () => {
    expect(sameFilter({ a: '1', b: undefined, c: '' }, { a: '1' })).toBe(true);
    expect(sameFilter({ a: '1', b: false }, { b: false, a: '1' })).toBe(true);
    expect(sameFilter({ a: '1' }, { a: '2' })).toBe(false);
  });
});
