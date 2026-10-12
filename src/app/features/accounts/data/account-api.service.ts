import { Injectable } from '@angular/core';
import { CrudApiService } from '@shared/crud/api';
import { toHttpParams } from '@shared/data';
import type { PageRequest, PageResponse } from '@shared/data';
import type { Observable } from 'rxjs';

import type {
  Account,
  AccountBalance,
  AccountFilter,
  AccountSummary,
  CreateAccountRequest,
  UpdateAccountRequest,
} from './account.model';

@Injectable({ providedIn: 'root' })
export class AccountApiService extends CrudApiService<
  Account,
  CreateAccountRequest,
  UpdateAccountRequest,
  AccountFilter
> {
  protected readonly path = '/accounts';

  options(filter: Partial<AccountFilter>, page: PageRequest): Observable<PageResponse<AccountSummary>> {
    return this.http.get<PageResponse<AccountSummary>>(`${this.url}/options`, { params: toHttpParams(filter, page) });
  }

  balance(id: string): Observable<AccountBalance> {
    return this.http.get<AccountBalance>(`${this.url}/${id}/balance`);
  }
}
