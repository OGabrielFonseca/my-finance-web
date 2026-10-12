import type { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { environment } from '@env/environment';
import { TranslocoService } from '@jsverse/transloco';

/** Envia o idioma ativo para a API, que traduz o detail dos erros. */
export const languageInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(environment.apiUrl)) return next(req);
  const lang = inject(TranslocoService).getActiveLang();
  return next(req.clone({ setHeaders: { 'Accept-Language': lang } }));
};
