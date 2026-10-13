import { Injectable } from '@angular/core';
import { CrudApiService } from '@shared/crud/api';
import type { PageRequest, PageResponse } from '@shared/data';
import { toHttpParams } from '@shared/data';
import type { Observable } from 'rxjs';

import type {
  Asset,
  AssetFilter,
  AssetPosition,
  AssetSummary,
  CreateAssetRequest,
  UpdateAssetRequest,
} from './investment.model';

@Injectable({ providedIn: 'root' })
export class AssetApiService extends CrudApiService<Asset, CreateAssetRequest, UpdateAssetRequest, AssetFilter> {
  protected readonly path = '/investments/assets';

  options(filter: Partial<AssetFilter>, page: PageRequest): Observable<PageResponse<AssetSummary>> {
    return this.http.get<PageResponse<AssetSummary>>(`${this.url}/options`, { params: toHttpParams(filter, page) });
  }

  position(id: string): Observable<AssetPosition> {
    return this.http.get<AssetPosition>(`${this.url}/${id}/position`);
  }
}
