import type { HttpContext } from '@angular/common/http';
import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '@env/environment';
import type { PageRequest, PageResponse } from '@shared/data';
import { MAX_PAGE_SIZE, toHttpParams } from '@shared/data';
import type { Observable } from 'rxjs';
import { map } from 'rxjs';

import type {
  BankAccountLink,
  ConnectTokenResponse,
  ChangeImportFromRequest,
  CreateBankAccountRequest,
  CreateLinkedCreditCardRequest,
  CreditCardLink,
  Integration,
  IntegrationConnection,
  IntegrationLog,
  IntegrationProvider,
  LinkAccountRequest,
  LinkCreditCardRequest,
  RegisterConnectionRequest,
  RenameConnectionRequest,
  SaveIntegrationRequest,
  SyncOutcome,
  SyncSummary,
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

  /** Sincroniza todos os bancos do usuário. Um banco com erro não faz a chamada falhar. */
  sync(): Observable<SyncOutcome[]> {
    return this.http.post<SyncOutcome[]>(`${this.url}/sync`, null);
  }

  /** Contadores de um banco. Sincronizado há pouco ou em andamento vira 422 (tratado pelo errorInterceptor). */
  syncConnection(connectionId: string): Observable<SyncSummary> {
    return this.http.post<SyncSummary>(`${this.url}/connections/${connectionId}/sync`, null);
  }

  /** Todas as contas do banco. A API pagina; MAX_PAGE_SIZE cobre o uso de uma pessoa. */
  accounts(): Observable<BankAccountLink[]> {
    return this.http
      .get<PageResponse<BankAccountLink>>(`${this.url}/accounts`, {
        params: toHttpParams({}, { page: 0, size: MAX_PAGE_SIZE }),
      })
      .pipe(map((page) => page.items));
  }

  /** Vincula; devolve a conta já com pendingItems (itens na fila desta conta). */
  link(linkId: string, body: LinkAccountRequest, context?: HttpContext): Observable<BankAccountLink> {
    return this.http.post<BankAccountLink>(`${this.url}/accounts/${linkId}/link`, body, { context });
  }

  createAccount(linkId: string, body: CreateBankAccountRequest, context?: HttpContext): Observable<BankAccountLink> {
    return this.http.post<BankAccountLink>(`${this.url}/accounts/${linkId}/create-account`, body, { context });
  }

  /** Altera a data de corte de uma conta vinculada (API §1.3). Responde o vínculo com pendingItems atualizado. */
  changeImportFrom(linkId: string, body: ChangeImportFromRequest, context?: HttpContext): Observable<BankAccountLink> {
    return this.http.patch<BankAccountLink>(`${this.url}/accounts/${linkId}/import-from`, body, { context });
  }

  ignoreAccount(linkId: string): Observable<BankAccountLink> {
    return this.http.post<BankAccountLink>(`${this.url}/accounts/${linkId}/ignore`, null);
  }

  unlinkAccount(linkId: string): Observable<BankAccountLink> {
    return this.http.post<BankAccountLink>(`${this.url}/accounts/${linkId}/unlink`, null);
  }

  adjustBalance(linkId: string): Observable<BankAccountLink> {
    return this.http.post<BankAccountLink>(`${this.url}/accounts/${linkId}/adjust-balance`, null);
  }

  /** Contas CREDIT da Pluggy, todas (mesma paginação de accounts()). */
  creditCardLinks(): Observable<CreditCardLink[]> {
    return this.http
      .get<PageResponse<CreditCardLink>>(`${this.url}/credit-card-links`, {
        params: toHttpParams({}, { page: 0, size: MAX_PAGE_SIZE }),
      })
      .pipe(map((page) => page.items));
  }

  linkCreditCard(linkId: string, body: LinkCreditCardRequest, context?: HttpContext): Observable<CreditCardLink> {
    return this.http.post<CreditCardLink>(`${this.url}/credit-card-links/${linkId}/link`, body, { context });
  }

  createLinkedCreditCard(
    linkId: string,
    body: CreateLinkedCreditCardRequest,
    context?: HttpContext,
  ): Observable<CreditCardLink> {
    return this.http.post<CreditCardLink>(`${this.url}/credit-card-links/${linkId}/create-card`, body, { context });
  }

  ignoreCreditCard(linkId: string): Observable<CreditCardLink> {
    return this.http.post<CreditCardLink>(`${this.url}/credit-card-links/${linkId}/ignore`, null);
  }

  unlinkCreditCard(linkId: string): Observable<CreditCardLink> {
    return this.http.post<CreditCardLink>(`${this.url}/credit-card-links/${linkId}/unlink`, null);
  }
}
