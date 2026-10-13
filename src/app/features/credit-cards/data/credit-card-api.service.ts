import type { HttpContext } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { CrudApiService } from '@shared/crud/api';
import type { PageRequest, PageResponse } from '@shared/data';
import { toHttpParams } from '@shared/data';
import type { Observable } from 'rxjs';

import type {
  CreditCard,
  CreditCardFilter,
  CreditCardRequest,
  CreditCardSummary,
  Invoice,
  PayInvoiceRequest,
  PurchaseRequest,
} from './credit-card.model';

/** Cartões seguem o CRUD. Faturas e compras são aninhadas: cada método recebe o cardId. */
@Injectable({ providedIn: 'root' })
export class CreditCardApiService extends CrudApiService<
  CreditCard,
  CreditCardRequest,
  CreditCardRequest,
  CreditCardFilter
> {
  protected readonly path = '/credit-cards';

  options(filter: Partial<CreditCardFilter>, page: PageRequest): Observable<PageResponse<CreditCardSummary>> {
    return this.http.get<PageResponse<CreditCardSummary>>(`${this.url}/options`, {
      params: toHttpParams(filter, page),
    });
  }

  invoices(cardId: string, page: PageRequest): Observable<PageResponse<Invoice>> {
    return this.http.get<PageResponse<Invoice>>(`${this.url}/${cardId}/invoices`, {
      params: toHttpParams({}, page),
    });
  }

  invoice(cardId: string, invoiceId: string): Observable<Invoice> {
    return this.http.get<Invoice>(`${this.url}/${cardId}/invoices/${invoiceId}`);
  }

  close(cardId: string, invoiceId: string): Observable<Invoice> {
    return this.http.post<Invoice>(`${this.url}/${cardId}/invoices/${invoiceId}/close`, null);
  }

  pay(cardId: string, invoiceId: string, body: PayInvoiceRequest = {}, context?: HttpContext): Observable<Invoice> {
    return this.http.post<Invoice>(`${this.url}/${cardId}/invoices/${invoiceId}/payment`, body, { context });
  }

  purchase(cardId: string, body: PurchaseRequest, context?: HttpContext): Observable<unknown> {
    return this.http.post(`${this.url}/${cardId}/purchases`, body, { context });
  }

  /** transactionId de qualquer parcela: todas as parcelas da compra são excluídas. */
  deletePurchase(cardId: string, transactionId: string): Observable<null> {
    return this.http.delete<null>(`${this.url}/${cardId}/purchases/${transactionId}`);
  }
}
