import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '@env/environment';
import type { Observable } from 'rxjs';

import type { Portfolio } from './investment.model';

/** Não é CRUD: a carteira é só leitura, calculada pela API a preço de custo. */
@Injectable({ providedIn: 'root' })
export class PortfolioApiService {
  private readonly http = inject(HttpClient);

  get(): Observable<Portfolio> {
    return this.http.get<Portfolio>(`${environment.apiUrl}/investments/portfolio`);
  }
}
