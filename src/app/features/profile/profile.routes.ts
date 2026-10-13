import type { Routes } from '@angular/router';
import { provideTranslocoScope } from '@jsverse/transloco';

import { ProfilePage } from './profile.page';

export default [{ path: '', component: ProfilePage, providers: [provideTranslocoScope('profile')] }] satisfies Routes;
