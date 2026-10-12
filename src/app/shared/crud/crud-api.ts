import type { HttpContext } from '@angular/common/http';
import { HttpClient } from '@angular/common/http';
import { inject } from '@angular/core';
import { environment } from '@env/environment';
import type { Observable } from 'rxjs';

import { toHttpParams } from '../data/http-params';
import type { PageRequest, PageResponse } from '../data/page';

/** Fonte de uma listagem paginada (o que o injectCrudList precisa). */
export interface ListSource<T, F> {
  list(filter: Partial<F>, page: PageRequest): Observable<PageResponse<T>>;
}

/**
 * Service HTTP genérico de um recurso. Nem todo recurso tem todas as operações: a tela declara quais ações mostra.
 * Criação e edição podem ter corpos diferentes (TCreate × TUpdate).
 */
export abstract class CrudApi<
  T extends { id: string },
  TCreate,
  TUpdate = TCreate,
  TFilter extends object = object,
> implements ListSource<T, TFilter> {
  protected readonly http = inject(HttpClient);
  protected abstract readonly path: string; // ex.: '/accounts'

  protected get url(): string {
    return `${environment.apiUrl}${this.path}`;
  }

  list(filter: Partial<TFilter>, page: PageRequest): Observable<PageResponse<T>> {
    return this.http.get<PageResponse<T>>(this.url, { params: toHttpParams(filter, page) });
  }

  get(id: string): Observable<T> {
    return this.http.get<T>(`${this.url}/${id}`);
  }

  create(body: TCreate, context?: HttpContext): Observable<T> {
    return this.http.post<T>(this.url, body, { context });
  }

  update(id: string, body: TUpdate, context?: HttpContext): Observable<T> {
    return this.http.put<T>(`${this.url}/${id}`, body, { context });
  }

  delete(id: string): Observable<null> {
    return this.http.delete<null>(`${this.url}/${id}`);
  }

  /** PATCH /{id}/archive → 204, sem corpo (o HttpClient entrega null). */
  archive(id: string): Observable<null> {
    return this.http.patch<null>(`${this.url}/${id}/archive`, null);
  }
}
