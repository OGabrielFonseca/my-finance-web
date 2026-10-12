import { HttpParams } from '@angular/common/http';

import { toLocalDate } from './dates';
import type { PageRequest } from './page';

/** Filtro → query params, ignorando vazios. As chaves do filtro têm o mesmo nome dos params da API. */
export function toHttpParams(filter: object = {}, page?: PageRequest): HttpParams {
  let params = new HttpParams();
  for (const [key, value] of Object.entries(filter)) {
    if (value === null || value === undefined || value === '') continue;
    params = params.set(key, serialize(value));
  }
  if (page) {
    params = params.set('page', page.page).set('size', page.size);
    if (page.sort) params = params.set('sort', `${page.sort.field},${page.sort.direction}`);
  }
  return params;
}

function serialize(value: unknown): string {
  return value instanceof Date ? toLocalDate(value) : String(value);
}
