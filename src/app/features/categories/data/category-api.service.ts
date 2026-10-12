import { Injectable } from '@angular/core';
import { CrudApiService } from '@shared/crud/api';
import { toHttpParams } from '@shared/data';
import type { PageRequest, PageResponse } from '@shared/data';
import { MAX_PAGE_SIZE } from '@shared/data';
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
export class CategoryApiService extends CrudApiService<
  Category,
  CreateCategoryRequest,
  UpdateCategoryRequest,
  CategoryFilter
> {
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
