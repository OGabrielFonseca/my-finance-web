import type { Routes } from '@angular/router';
import { provideTranslocoScope } from '@jsverse/transloco';
import { provideCharts } from '@shared/ui/chart/echarts';

import { DashboardPage } from './dashboard.page';

export default [
  { path: '', component: DashboardPage, providers: [provideTranslocoScope('dashboard'), provideCharts()] },
] satisfies Routes;
