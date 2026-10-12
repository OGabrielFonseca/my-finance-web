import type { HttpParams } from '@angular/common/http';
import type { PageResponse } from '@shared/data/page';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '@shared/data/page';

import type { MockResult } from './mock-http';
import { malformed, ok } from './mock-http';

export type SortAccessor<T> = (item: T) => string | number;

/**
 * Ordena e pagina como o Spring Data: ?page (0), ?size (20, máx. 100), ?sort=campo,dir com o nome do atributo da
 * entidade. Campo de ordenação desconhecido → 400 MALFORMED_REQUEST, como na API.
 */
export function paginate<T, R = T>(
  items: readonly T[],
  query: HttpParams,
  sortable: Record<string, SortAccessor<T>>,
  defaultSort: string,
  toResponse: (item: T) => R = (item) => item as unknown as R,
): MockResult {
  const [field, direction = 'asc'] = (query.get('sort') ?? defaultSort).split(',');
  const accessor = sortable[field];
  if (!accessor || (direction !== 'asc' && direction !== 'desc')) return malformed();

  const size = Math.min(
    Math.max(Number(query.get('size') ?? DEFAULT_PAGE_SIZE) || DEFAULT_PAGE_SIZE, 1),
    MAX_PAGE_SIZE,
  );
  const page = Math.max(Number(query.get('page') ?? 0) || 0, 0);
  const factor = direction === 'desc' ? -1 : 1;
  const sorted = [...items].sort((a, b) => factor * compare(accessor(a), accessor(b)));

  const response: PageResponse<R> = {
    items: sorted.slice(page * size, page * size + size).map(toResponse),
    page,
    size,
    totalItems: items.length,
    totalPages: Math.ceil(items.length / size),
  };
  return ok(response);
}

function compare(a: string | number, b: string | number): number {
  return typeof a === 'number' && typeof b === 'number' ? a - b : String(a).localeCompare(String(b), 'pt-BR');
}

/** Filtro de texto "contém", sem diferenciar maiúsculas. */
export function contains(value: string | null | undefined, search: string | null): boolean {
  return !search || (value ?? '').toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR'));
}

/** Filtro booleano opcional (?archived=true|false; ausente = todos). */
export function matchesBoolean(value: boolean, param: string | null): boolean {
  return param === null || value === (param === 'true');
}
