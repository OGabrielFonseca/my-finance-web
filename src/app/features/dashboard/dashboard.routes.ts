import type { Routes } from '@angular/router';
import { provideTranslocoScope } from '@jsverse/transloco';
import { provideCharts } from '@shared/ui';

import { DashboardPage } from './dashboard.page';

export default [
  { path: '', component: DashboardPage, providers: [provideTranslocoScope('dashboard'), provideCharts()] },
] satisfies Routes;
