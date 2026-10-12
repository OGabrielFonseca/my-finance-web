import type { AbstractControl } from '@angular/forms';

import type { ApiError } from '../data/api-error';

/**
 * Aplica os erros de campo de um 400 VALIDATION_ERROR nos controles (errors.server, exibido pelo <app-field>).
 * Os nomes de campo do backend são os do formulário; quando divergirem, informe o mapeamento.
 * Devolve as mensagens que não acharam controle, para o formulário mostrar como erro geral.
 */
export function applyServerErrors(
  form: AbstractControl,
  error: ApiError,
  fieldMap: Readonly<Record<string, string>> = {},
): string[] {
  const unmatched: string[] = [];
  for (const { field, message } of error.fieldErrors) {
    const control = form.get(fieldMap[field] ?? field);
    if (control) {
      control.setErrors({ ...control.errors, server: message });
      control.markAsTouched();
    } else {
      unmatched.push(message);
    }
  }
  return unmatched;
}
