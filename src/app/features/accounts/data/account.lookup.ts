import { Injectable, inject } from '@angular/core';
import { Lookup } from '@shared/crud/lookup';
import { MAX_PAGE_SIZE } from '@shared/data/page';

import { AccountApi } from './account.api';
import type { AccountSummary } from './account.model';

/** Contas ativas para seletores (cache). Invalidar ao salvar ou arquivar uma conta. */
@Injectable({ providedIn: 'root' })
export class AccountLookup extends Lookup<AccountSummary> {
  constructor() {
    const api = inject(AccountApi);
    super(() => api.options({ archived: false }, { page: 0, size: MAX_PAGE_SIZE }));
  }
}
