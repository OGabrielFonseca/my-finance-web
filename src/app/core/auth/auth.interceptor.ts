import type { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { environment } from '@env/environment';

import { AuthStoreService } from './auth-store.service';

/** Adiciona o Bearer nas chamadas para a API, exceto /auth/**. */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = inject(AuthStoreService).token();
  const isApi = req.url.startsWith(environment.apiUrl);
  const isAuthEndpoint = req.url.startsWith(`${environment.apiUrl}/auth/`);
  if (!token || !isApi || isAuthEndpoint) return next(req);
  return next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
};
