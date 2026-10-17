import type { Routes } from '@angular/router';

import { authGuard, guestGuard } from './core/auth/auth.guards';
import { NotFoundPage } from './core/layout/not-found.page';
import { ShellComponent } from './core/layout/shell.component';

export const routes: Routes = [
  { path: 'login', canActivate: [guestGuard], loadChildren: () => import('./features/auth/auth.routes') },
  { path: 'register', canActivate: [guestGuard], loadChildren: () => import('./features/auth/register.routes') },
  {
    path: '',
    component: ShellComponent,
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      { path: 'dashboard', loadChildren: () => import('./features/dashboard/dashboard.routes') },
      { path: 'transactions', loadChildren: () => import('./features/transactions/transactions.routes') },
      { path: 'imports', loadChildren: () => import('./features/imports/imports.routes') },
      { path: 'accounts', loadChildren: () => import('./features/accounts/accounts.routes') },
      { path: 'categories', loadChildren: () => import('./features/categories/categories.routes') },
      { path: 'credit-cards', loadChildren: () => import('./features/credit-cards/credit-cards.routes') },
      { path: 'budgets', loadChildren: () => import('./features/budgets/budgets.routes') },
      { path: 'investments', loadChildren: () => import('./features/investments/investments.routes') },
      { path: 'integrations', loadChildren: () => import('./features/integrations/integrations.routes') },
      { path: 'profile', loadChildren: () => import('./features/profile/profile.routes') },
      { path: '**', component: NotFoundPage },
    ],
  },
];
