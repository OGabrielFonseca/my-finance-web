import type { Signal } from '@angular/core';
import { computed, effect, inject, signal, untracked } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, catchError, finalize, map, merge, of, switchMap } from 'rxjs';

import type { PageRequest, PageResponse, SortSpec } from '../data/page';
import { DEFAULT_PAGE_SIZE, samePageRequest } from '../data/page';
import type { ListSource } from './crud-api';
import type { FilterField, FilterValue } from './filter';
import { readListState, writeListState } from './list-state';

export interface CrudListOptions<F> {
  sort?: SortSpec; // ordenação inicial
  size?: number; // padrão 20
  initialFilter?: Partial<F>; // ex.: { archived: false }
  filterFields?: readonly FilterField[]; // usado para ler o filtro da URL com os tipos certos
  syncWithUrl?: boolean; // padrão true
}

/** O que a <app-data-table> precisa de uma listagem. */
export interface PagedList<T> {
  readonly items: Signal<T[]>;
  readonly totalItems: Signal<number>;
  readonly loading: Signal<boolean>;
  readonly page: Signal<PageRequest>;
  setPage(page: Partial<PageRequest>): void;
}

export interface CrudList<T, F> extends PagedList<T> {
  readonly filter: Signal<Partial<F>>;
  /** Filtro novo volta para a página 0. */
  setFilter(filter: Partial<F>): void;
  reload(): void;
}

/**
 * Estado de uma listagem paginada: filtro, página, ordenação, carregamento e sincronização com a URL.
 * Chamar em inicializador de campo (contexto de injeção): `readonly list = injectCrudList(this.api, {...})`.
 */
export function injectCrudList<T, F extends object>(
  api: ListSource<T, F>,
  options: CrudListOptions<F> = {},
): CrudList<T, F> {
  const route = inject(ActivatedRoute);
  const router = inject(Router);
  const syncWithUrl = options.syncWithUrl ?? true;
  const initialFilter = options.initialFilter ?? {};
  const defaultSize = options.size ?? DEFAULT_PAGE_SIZE;
  const fromUrl = syncWithUrl ? readListState(route.snapshot.queryParamMap, options.filterFields ?? []) : undefined;

  const filter = signal<Partial<F>>({ ...initialFilter, ...(fromUrl?.filter as Partial<F> | undefined) });
  const page = signal<PageRequest>({
    page: fromUrl?.page ?? 0,
    size: fromUrl?.size ?? defaultSize,
    sort: fromUrl?.sort ?? options.sort,
  });
  const data = signal<PageResponse<T> | null>(null);
  const loading = signal(false);
  const reload$ = new Subject<void>();
  const query = computed(() => ({ filter: filter(), page: page() }));

  // Filtro ou página mudou (ou reload): nova busca. O switchMap cancela a anterior.
  merge(toObservable(query), reload$.pipe(map(() => query())))
    .pipe(
      switchMap((q) => {
        loading.set(true);
        return api.list(q.filter, q.page).pipe(
          catchError(() => of(null)), // o errorInterceptor já avisou; mantém os dados anteriores
          finalize(() => loading.set(false)),
        );
      }),
      takeUntilDestroyed(),
    )
    .subscribe((result) => {
      if (result) data.set(result);
    });

  if (syncWithUrl) {
    effect(() => {
      const queryParams = writeListState(filter() as FilterValue, page(), {
        filter: initialFilter as FilterValue,
        size: defaultSize,
        sort: options.sort,
      });
      untracked(() => void router.navigate([], { relativeTo: route, queryParams, replaceUrl: true }));
    });
  }

  return {
    filter: filter.asReadonly(),
    page: page.asReadonly(),
    loading: loading.asReadonly(),
    items: computed(() => data()?.items ?? []),
    totalItems: computed(() => data()?.totalItems ?? 0),
    setFilter(next) {
      filter.set(next);
      page.update((current) => ({ ...current, page: 0 }));
    },
    setPage(next) {
      const merged = { ...page(), ...next };
      if (!samePageRequest(merged, page())) page.set(merged);
    },
    reload() {
      reload$.next();
    },
  };
}
