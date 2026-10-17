import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '@env/environment';
import type { PageRequest, PageResponse } from '@shared/data';
import { toHttpParams } from '@shared/data';
import type { Observable } from 'rxjs';

import type {
  ApproveRequest,
  ApproveResponse,
  IgnoreRequest,
  ImportCount,
  ImportFilter,
  ImportItem,
} from './import.model';

/** Endpoints de /imports (fila de revisão). Não estende o CrudApiService: aprovar e ignorar são em lote. */
@Injectable({ providedIn: 'root' })
export class ImportApiService {
  private readonly http = inject(HttpClient);
  /** A fila é do provedor: /integrations/{provider}/imports (hoje só o Pluggy). */
  private readonly url = `${environment.apiUrl}/integrations/pluggy/imports`;

  list(filter: Partial<ImportFilter>, page: PageRequest): Observable<PageResponse<ImportItem>> {
    return this.http.get<PageResponse<ImportItem>>(this.url, { params: toHttpParams(filter, page) });
  }

  count(): Observable<ImportCount> {
    return this.http.get<ImportCount>(`${this.url}/count`);
  }

  /** Tudo ou nada: se um item falhar, nenhum lançamento é criado e o erro aponta o item. */
  approve(body: ApproveRequest): Observable<ApproveResponse> {
    return this.http.post<ApproveResponse>(`${this.url}/approve`, body);
  }

  ignore(body: IgnoreRequest): Observable<unknown> {
    return this.http.post<unknown>(`${this.url}/ignore`, body);
  }
}
