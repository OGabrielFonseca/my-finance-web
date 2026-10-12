import type { Routes } from '@angular/router';
import { provideTranslocoScope } from '@jsverse/transloco';

import { LoginPage } from './login.page';

export default [{ path: '', component: LoginPage, providers: [provideTranslocoScope('auth')] }] satisfies Routes;
