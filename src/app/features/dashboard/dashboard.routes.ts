import type { Routes } from '@angular/router';
import { provideCharts } from '@shared/ui/chart';

import { DashboardPage } from './dashboard.page';

export default [{ path: '', component: DashboardPage, providers: [provideCharts()] }] satisfies Routes;
