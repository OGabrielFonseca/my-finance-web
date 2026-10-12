import type { ParamMap, Params } from '@angular/router';

import type { PageRequest, SortSpec } from '../../data/page';
import type { FilterField, FilterValue } from '../filter/filter';
import { fieldKeys } from '../filter/filter';

export interface UrlListState {
  filter: FilterValue; // só o que veio na URL
  page?: number;
  size?: number;
  sort?: SortSpec;
}

/** Lê filtro, página e ordenação da URL, convertendo os tipos pelas definições dos filtros. */
export function readListState(params: ParamMap, fields: readonly FilterField[]): UrlListState {
  const filter: FilterValue = {};
  for (const field of fields) {
    for (const key of fieldKeys(field)) {
      const value = params.get(key);
      if (value === null) continue;
      filter[key] = field.type === 'boolean' ? value === 'true' : value;
    }
  }
  return {
    filter,
    page: toInt(params.get('page')),
    size: toInt(params.get('size')),
    sort: toSort(params.get('sort')),
  };
}

/** Grava na URL só o que difere do padrão, para o link ficar curto. */
export function writeListState(
  filter: FilterValue,
  page: PageRequest,
  defaults: { filter: FilterValue; size: number; sort?: SortSpec },
): Params {
  const params: Params = {};
  for (const [key, value] of Object.entries(filter)) {
    if (value === undefined || value === '' || value === defaults.filter[key]) continue;
    params[key] = String(value);
  }
  if (page.page > 0) params['page'] = page.page;
  if (page.size !== defaults.size) params['size'] = page.size;
  if (page.sort && (page.sort.field !== defaults.sort?.field || page.sort.direction !== defaults.sort?.direction)) {
    params['sort'] = `${page.sort.field},${page.sort.direction}`;
  }
  return params;
}

function toInt(value: string | null): number | undefined {
  const parsed = value === null ? NaN : Number.parseInt(value, 10);
  return Number.isNaN(parsed) || parsed < 0 ? undefined : parsed;
}

function toSort(value: string | null): SortSpec | undefined {
  const [field, direction] = value?.split(',') ?? [];
  return field && (direction === 'asc' || direction === 'desc') ? { field, direction } : undefined;
}
