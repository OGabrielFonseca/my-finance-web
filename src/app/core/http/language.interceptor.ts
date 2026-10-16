import type { HttpInterceptorFn } from '@angular/common/http';
import { environment } from '@env/environment';

import { APP_LOCALE } from '../i18n/locale';

/** Envia o idioma do app para a API, que localiza o detail dos erros. */
export const languageInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(environment.apiUrl)) return next(req);
  return next(req.clone({ setHeaders: { 'Accept-Language': APP_LOCALE } }));
};
