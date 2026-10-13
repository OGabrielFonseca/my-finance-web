import { Injectable } from '@angular/core';
import { CrudApiService } from '@shared/crud/api';

import type { Budget, BudgetFilter, CreateBudgetRequest, UpdateBudgetRequest } from './budget.model';

@Injectable({ providedIn: 'root' })
export class BudgetApiService extends CrudApiService<Budget, CreateBudgetRequest, UpdateBudgetRequest, BudgetFilter> {
  protected readonly path = '/budgets';
}
