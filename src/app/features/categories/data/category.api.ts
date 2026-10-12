import { Injectable } from '@angular/core';
import { CrudApi } from '@shared/crud/crud-api';
import { toHttpParams } from '@shared/data/http-params';
import type { PageRequest, PageResponse } from '@shared/data/page';
import { MAX_PAGE_SIZE } from '@shared/data/page';
import type { Observable } from 'rxjs';
import { map } from 'rxjs';

import type {
  Category,
  CategoryFilter,
  CategorySummary,
  CreateCategoryRequest,
  UpdateCategoryRequest,
} from './category.model';

/** Categorias não têm GET /{id} nem DELETE: a edição recebe a linha e a remoção é arquivar. */
@Injectable({ providedIn: 'root' })
export class CategoryApi extends CrudApi<Category, CreateCategoryRequest, UpdateCategoryRequest, CategoryFilter> {
  protected readonly path = '/categories';

  /** Todas de uma vez (a tela mostra a árvore inteira; limite de 100 da API). */
  listAll(filter: Partial<CategoryFilter>): Observable<Category[]> {
    return this.list(filter, { page: 0, size: MAX_PAGE_SIZE, sort: { field: 'name', direction: 'asc' } }).pipe(
      map((page) => page.items),
    );
  }

  options(filter: Partial<CategoryFilter>, page: PageRequest): Observable<PageResponse<CategorySummary>> {
    return this.http.get<PageResponse<CategorySummary>>(`${this.url}/options`, { params: toHttpParams(filter, page) });
  }
}
