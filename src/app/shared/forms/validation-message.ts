import type { ValidationErrors } from '@angular/forms';

const KNOWN_ERRORS = ['required', 'maxlength', 'minlength', 'min', 'email', 'pattern'];

/** Mensagem do primeiro erro: o erro do servidor aparece como veio; os do Angular viram `validation.<erro>`. */
export function validationMessage(
  errors: ValidationErrors,
  translate: (key: string, params?: Record<string, unknown>) => string,
): string {
  if (typeof errors['server'] === 'string') return errors['server'];
  const [key] = Object.keys(errors);
  if (!key) return '';
  const params =
    typeof errors[key] === 'object' && errors[key] !== null ? (errors[key] as Record<string, unknown>) : {};
  return translate(`validation.${KNOWN_ERRORS.includes(key) ? key : 'invalid'}`, params);
}
