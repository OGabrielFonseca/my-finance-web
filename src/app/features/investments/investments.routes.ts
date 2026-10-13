import type { Routes } from '@angular/router';
import { provideTranslocoScope } from '@jsverse/transloco';

import { AssetListPage } from './assets/asset-list.page';
import { IncomeListPage } from './incomes/income-list.page';
import { OperationListPage } from './operations/operation-list.page';
import { PortfolioPage } from './portfolio/portfolio.page';

export default [
  { path: '', component: PortfolioPage, providers: [provideTranslocoScope('investments')] },
  { path: 'assets', component: AssetListPage, providers: [provideTranslocoScope('investments')] },
  { path: 'operations', component: OperationListPage, providers: [provideTranslocoScope('investments')] },
  { path: 'incomes', component: IncomeListPage, providers: [provideTranslocoScope('investments')] },
] satisfies Routes;
