import { Injectable, inject } from '@angular/core';
import { Lookup } from '@shared/crud/lookup';
import { MAX_PAGE_SIZE } from '@shared/data/page';

import { CategoryApi } from './category.api';
import type { CategorySummary } from './category.model';

/** Categorias ativas (sem a de sistema), para seletores de formulário e filtro. */
@Injectable({ providedIn: 'root' })
export class ActiveCategoryLookup extends Lookup<CategorySummary> {
  constructor() {
    const api = inject(CategoryApi);
    super(() => api.options({ archived: false }, { page: 0, size: MAX_PAGE_SIZE }));
  }
}

/**
 * Todas as categorias do usuário, inclusive arquivadas, sem a de sistema. O extrato usa para saber quais lançamentos
 * são de categoria de sistema (os que não estão aqui), já que o lançamento não traz essa informação.
 */
@Injectable({ providedIn: 'root' })
export class AllCategoryLookup extends Lookup<CategorySummary> {
  constructor() {
    const api = inject(CategoryApi);
    super(() => api.options({}, { page: 0, size: MAX_PAGE_SIZE }));
  }
}
