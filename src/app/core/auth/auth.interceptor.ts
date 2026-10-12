import type { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { environment } from '@env/environment';

import { AuthStore } from './auth.store';

/** Adiciona o Bearer nas chamadas para a API, exceto /auth/**. */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = inject(AuthStore).token();
  const isApi = req.url.startsWith(environment.apiUrl);
  const isAuthEndpoint = req.url.startsWith(`${environment.apiUrl}/auth/`);
  if (!token || !isApi || isAuthEndpoint) return next(req);
  return next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
};
