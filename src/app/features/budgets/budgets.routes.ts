import type { Routes } from '@angular/router';
import { provideTranslocoScope } from '@jsverse/transloco';

import { BudgetListPage } from './list/budget-list.page';

export default [
  { path: '', component: BudgetListPage, providers: [provideTranslocoScope('budgets')] },
] satisfies Routes;
