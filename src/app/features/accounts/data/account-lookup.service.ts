import { Injectable, inject } from '@angular/core';
import { LookupService } from '@shared/crud/api';
import { MAX_PAGE_SIZE } from '@shared/data';

import { AccountApiService } from './account-api.service';
import type { AccountSummary } from './account.model';

/** Contas ativas para seletores (cache). Invalidar ao salvar ou arquivar uma conta. */
@Injectable({ providedIn: 'root' })
export class AccountLookupService extends LookupService<AccountSummary> {
  constructor() {
    const api = inject(AccountApiService);
    super(() => api.options({ archived: false }, { page: 0, size: MAX_PAGE_SIZE }));
  }
}
