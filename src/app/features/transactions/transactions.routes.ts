import type { Routes } from '@angular/router';
import { provideTranslocoScope } from '@jsverse/transloco';

import { TransactionListPage } from './list/transaction-list.page';

export default [
  { path: '', component: TransactionListPage, providers: [provideTranslocoScope('transactions')] },
] satisfies Routes;
