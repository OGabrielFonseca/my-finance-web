import { Injectable } from '@angular/core';
import { CrudApiService } from '@shared/crud/api';

import type { CreateOperationRequest, Operation, OperationFilter, UpdateOperationRequest } from './investment.model';

@Injectable({ providedIn: 'root' })
export class OperationApiService extends CrudApiService<
  Operation,
  CreateOperationRequest,
  UpdateOperationRequest,
  OperationFilter
> {
  protected readonly path = '/investments/operations';
}
