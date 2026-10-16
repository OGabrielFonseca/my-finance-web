import type { HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { HttpErrorResponse } from '@angular/common/http';
import { inject, isDevMode } from '@angular/core';
import { environment } from '@env/environment';
import type { ApiError } from '@shared/data';
import { toApiError } from '@shared/data';
import { SKIP_BUSINESS_ERROR_TOAST } from '@shared/data';
import { NotifierService } from '@shared/ui';
import { catchError, throwError } from 'rxjs';

import { AuthStoreService } from '../auth/auth-store.service';

/** Converte HttpErrorResponse em ApiError e aplica o comportamento padrão por status (escopo §5.2). */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const notifier = inject(NotifierService);
  const auth = inject(AuthStoreService);

  return next(req).pipe(
    catchError((err: unknown) => {
      if (!(err instanceof HttpErrorResponse)) return throwError(() => err);
      const error = toApiError(err);
      react(error, req, notifier, auth);
      return throwError(() => error);
    }),
  );
};

function react(error: ApiError, req: HttpRequest<unknown>, notifier: NotifierService, auth: AuthStoreService): void {
  const isAuthEndpoint = req.url.startsWith(`${environment.apiUrl}/auth/`);

  if (error.status === 0) return notifier.error('Sem conexão com o servidor.');
  if (error.status >= 500) return notifier.error('Erro inesperado. Tente novamente.');
  if (error.status === 401) {
    // No login/cadastro o formulário mostra o detail; fora dele, a sessão acabou.
    if (!isAuthEndpoint) auth.expireSession();
    return;
  }
  if (error.isValidation) return; // o formulário mostra os erros nos campos
  if ((error.status === 409 || error.status === 422) && req.context.get(SKIP_BUSINESS_ERROR_TOAST)) return;
  if (error.status === 400 && isDevMode()) console.error('[api] requisição malformada', req.urlWithParams, error);

  if (error.detail) notifier.error(error.detail);
  else notifier.error('Erro inesperado. Tente novamente.');
}
