import type { HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { HttpErrorResponse } from '@angular/common/http';
import { inject, isDevMode } from '@angular/core';
import { environment } from '@env/environment';
import type { ApiError } from '@shared/data/api-error';
import { toApiError } from '@shared/data/api-error';
import { SKIP_BUSINESS_ERROR_TOAST } from '@shared/data/http-context';
import { Notifier } from '@shared/ui/notifier';
import { catchError, throwError } from 'rxjs';

import { AuthStore } from '../auth/auth.store';

/** Converte HttpErrorResponse em ApiError e aplica o comportamento padrão por status (escopo §5.2). */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const notifier = inject(Notifier);
  const auth = inject(AuthStore);

  return next(req).pipe(
    catchError((err: unknown) => {
      if (!(err instanceof HttpErrorResponse)) return throwError(() => err);
      const error = toApiError(err);
      react(error, req, notifier, auth);
      return throwError(() => error);
    }),
  );
};

function react(error: ApiError, req: HttpRequest<unknown>, notifier: Notifier, auth: AuthStore): void {
  const isAuthEndpoint = req.url.startsWith(`${environment.apiUrl}/auth/`);

  if (error.status === 0) return notifier.errorKey('errors.network');
  if (error.status >= 500) return notifier.errorKey('errors.unexpected');
  if (error.status === 401) {
    // No login/cadastro o formulário mostra o detail; fora dele, a sessão acabou.
    if (!isAuthEndpoint) auth.expireSession();
    return;
  }
  if (error.isValidation) return; // o formulário mostra os erros nos campos
  if ((error.status === 409 || error.status === 422) && req.context.get(SKIP_BUSINESS_ERROR_TOAST)) return;
  if (error.status === 400 && isDevMode()) console.error('[api] requisição malformada', req.urlWithParams, error);

  if (error.detail) notifier.error(error.detail);
  else notifier.errorKey('errors.unexpected');
}
