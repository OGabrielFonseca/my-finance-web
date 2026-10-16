import type { Routes } from '@angular/router';

import { AssetListPage } from './assets/asset-list.page';
import { IncomeListPage } from './incomes/income-list.page';
import { OperationListPage } from './operations/operation-list.page';
import { PortfolioPage } from './portfolio/portfolio.page';

export default [
  { path: '', component: PortfolioPage },
  { path: 'assets', component: AssetListPage },
  { path: 'operations', component: OperationListPage },
  { path: 'incomes', component: IncomeListPage },
] satisfies Routes;
