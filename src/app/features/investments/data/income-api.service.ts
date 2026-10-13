import { Injectable } from '@angular/core';
import { CrudApiService } from '@shared/crud/api';

import type { CreateIncomeRequest, Income, IncomeFilter, UpdateIncomeRequest } from './investment.model';

@Injectable({ providedIn: 'root' })
export class IncomeApiService extends CrudApiService<Income, CreateIncomeRequest, UpdateIncomeRequest, IncomeFilter> {
  protected readonly path = '/investments/incomes';
}
