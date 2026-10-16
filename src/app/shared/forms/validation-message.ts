import type { ValidationErrors } from '@angular/forms';

const MESSAGES: Record<string, (params: Record<string, unknown>) => string> = {
  required: () => 'Campo obrigatório',
  maxlength: (p) => `Máximo de ${p['requiredLength']} caracteres`,
  minlength: (p) => `Mínimo de ${p['requiredLength']} caracteres`,
  min: (p) => `Valor mínimo: ${p['min']}`,
  email: () => 'E-mail inválido',
  pattern: () => 'Formato inválido',
};

const INVALID = 'Valor inválido';

/** Mensagem do primeiro erro: o erro do servidor aparece como veio; os do Angular viram texto em português. */
export function validationMessage(errors: ValidationErrors): string {
  if (typeof errors['server'] === 'string') return errors['server'];
  const [key] = Object.keys(errors);
  if (!key) return '';
  const params =
    typeof errors[key] === 'object' && errors[key] !== null ? (errors[key] as Record<string, unknown>) : {};
  return MESSAGES[key]?.(params) ?? INVALID;
}
