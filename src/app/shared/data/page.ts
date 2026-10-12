/** Espelha o PageResponse do backend. */
export interface PageResponse<T> {
  items: T[];
  page: number; // começa em 0
  size: number;
  totalItems: number;
  totalPages: number;
}

export interface SortSpec {
  field: string; // atributo da ENTIDADE no backend (ex.: 'transactionDate')
  direction: 'asc' | 'desc';
}

export interface PageRequest {
  page: number;
  size: number;
  sort?: SortSpec;
}

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export function samePageRequest(a: PageRequest, b: PageRequest): boolean {
  return (
    a.page === b.page && a.size === b.size && a.sort?.field === b.sort?.field && a.sort?.direction === b.sort?.direction
  );
}
