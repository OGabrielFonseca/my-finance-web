import type { Routes } from '@angular/router';
import { provideTranslocoScope } from '@jsverse/transloco';

import { AccountListPage } from './list/account-list.page';

export default [
  { path: '', component: AccountListPage, providers: [provideTranslocoScope('accounts')] },
] satisfies Routes;
