import { Injectable, inject } from '@angular/core';
import { LookupService } from '@shared/crud/api';
import { MAX_PAGE_SIZE } from '@shared/data';

import { AssetApiService } from './asset-api.service';
import type { AssetSummary } from './investment.model';

/** Ativos para seletores (cache). Invalidar ao salvar ou excluir um ativo. */
@Injectable({ providedIn: 'root' })
export class AssetLookupService extends LookupService<AssetSummary> {
  constructor() {
    const api = inject(AssetApiService);
    super(() => api.options({}, { page: 0, size: MAX_PAGE_SIZE }));
  }
}
