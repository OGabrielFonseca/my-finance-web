import type { Routes } from '@angular/router';
import { provideTranslocoScope } from '@jsverse/transloco';

import { RegisterPage } from './register.page';

export default [{ path: '', component: RegisterPage, providers: [provideTranslocoScope('auth')] }] satisfies Routes;
