import type { HttpContext } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { CrudApiService } from '@shared/crud/api';
import type { Observable } from 'rxjs';

import type {
  CreateTransactionRequest,
  CreateTransferRequest,
  Transaction,
  TransactionFilter,
  UpdateTransactionRequest,
} from './transaction.model';

/** Lançamentos não têm archive. Transferência é criada por um endpoint próprio e editada pelo PUT comum. */
@Injectable({ providedIn: 'root' })
export class TransactionApiService extends CrudApiService<
  Transaction,
  CreateTransactionRequest,
  UpdateTransactionRequest,
  TransactionFilter
> {
  protected readonly path = '/transactions';

  createTransfer(body: CreateTransferRequest, context?: HttpContext): Observable<Transaction> {
    return this.http.post<Transaction>(`${this.url}/transfers`, body, { context });
  }
}
