import type { HttpContext } from '@angular/common/http';
import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '@env/environment';
import type { PageRequest, PageResponse } from '@shared/data';
import { toHttpParams } from '@shared/data';
import type { Observable } from 'rxjs';

import type {
  ConnectTokenResponse,
  Integration,
  IntegrationConnection,
  IntegrationLog,
  IntegrationProvider,
  RegisterConnectionRequest,
  RenameConnectionRequest,
  SaveIntegrationRequest,
} from './integration.model';

/** Endpoints de /integrations/{provider}. Não estende o CrudApiService: não seguem o formato de CRUD. */
@Injectable({ providedIn: 'root' })
export class IntegrationApiService {
  private readonly http = inject(HttpClient);
  private readonly provider: IntegrationProvider = 'PLUGGY';

  private get url(): string {
    return `${environment.apiUrl}/integrations/${this.provider.toLowerCase()}`;
  }

  get(): Observable<Integration> {
    return this.http.get<Integration>(this.url);
  }

  save(body: SaveIntegrationRequest, context?: HttpContext): Observable<Integration> {
    return this.http.put<Integration>(this.url, body, { context });
  }

  remove(): Observable<null> {
    return this.http.delete<null>(this.url);
  }

  createConnectToken(): Observable<ConnectTokenResponse> {
    return this.http.post<ConnectTokenResponse>(`${this.url}/connect-token`, null);
  }

  registerConnection(externalId: string): Observable<IntegrationConnection> {
    const body: RegisterConnectionRequest = { externalId };
    return this.http.post<IntegrationConnection>(`${this.url}/connections`, body);
  }

  renameConnection(id: string, name: string | null): Observable<IntegrationConnection> {
    const body: RenameConnectionRequest = { name };
    return this.http.patch<IntegrationConnection>(`${this.url}/connections/${id}`, body);
  }

  deleteConnection(id: string): Observable<null> {
    return this.http.delete<null>(`${this.url}/connections/${id}`);
  }

  logs(page: PageRequest): Observable<PageResponse<IntegrationLog>> {
    return this.http.get<PageResponse<IntegrationLog>>(`${this.url}/logs`, { params: toHttpParams({}, page) });
  }
}
