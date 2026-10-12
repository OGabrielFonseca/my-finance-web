import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '@env/environment';
import type { YearMonth } from '@shared/data';
import type { Observable } from 'rxjs';

import type { DashboardSummary, ExpensesByCategory } from './dashboard.model';

/** Não é CRUD: service simples, sem herdar CrudApiService. */
@Injectable({ providedIn: 'root' })
export class DashboardApiService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/dashboard`;

  summary(month: YearMonth): Observable<DashboardSummary> {
    return this.http.get<DashboardSummary>(`${this.url}/summary`, { params: { month } });
  }

  expensesByCategory(month: YearMonth): Observable<ExpensesByCategory> {
    return this.http.get<ExpensesByCategory>(`${this.url}/expenses-by-category`, { params: { month } });
  }
}
