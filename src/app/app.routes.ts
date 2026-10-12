import type { Routes } from '@angular/router';

import { authGuard, guestGuard } from './core/auth/auth.guards';
import { NotFoundPage } from './core/layout/not-found.page';
import { ShellComponent } from './core/layout/shell.component';

export const routes: Routes = [
  { path: 'login', canActivate: [guestGuard], loadChildren: () => import('./features/auth/auth.routes') },
  {
    path: '',
    component: ShellComponent,
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      { path: 'dashboard', loadChildren: () => import('./features/dashboard/dashboard.routes') },
      { path: 'transactions', loadChildren: () => import('./features/transactions/transactions.routes') },
      { path: 'accounts', loadChildren: () => import('./features/accounts/accounts.routes') },
      { path: 'categories', loadChildren: () => import('./features/categories/categories.routes') },
      { path: '**', component: NotFoundPage },
    ],
  },
];
