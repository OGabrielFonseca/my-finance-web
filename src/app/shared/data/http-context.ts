import { HttpContext, HttpContextToken } from '@angular/common/http';

/**
 * Quando true, o errorInterceptor não mostra toast para 409/422: quem chamou exibe o erro (ex.: formulário em diálogo).
 * Os demais status continuam com o comportamento padrão.
 */
export const SKIP_BUSINESS_ERROR_TOAST = new HttpContextToken<boolean>(() => false);

export function skipBusinessErrorToast(): HttpContext {
  return new HttpContext().set(SKIP_BUSINESS_ERROR_TOAST, true);
}
