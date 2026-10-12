import type { Routes } from '@angular/router';
import { provideTranslocoScope } from '@jsverse/transloco';

import { CategoryListPage } from './list/category-list.page';

export default [
  { path: '', component: CategoryListPage, providers: [provideTranslocoScope('categories')] },
] satisfies Routes;
