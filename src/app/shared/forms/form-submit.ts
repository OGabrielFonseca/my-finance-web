import type { HttpContext } from '@angular/common/http';
import type { Signal } from '@angular/core';
import { DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type { FormGroup } from '@angular/forms';
import type { Observable } from 'rxjs';
import { finalize } from 'rxjs';

import { ApiError } from '../data/api-error';
import { skipBusinessErrorToast } from '../data/http-context';
import { applyServerErrors } from './server-errors';

export interface FormSubmit {
  readonly submitting: Signal<boolean>;
  /** Erro geral do formulário (401/409/422 ou erro de campo sem controle), exibido pelo <app-form-footer>. */
  readonly error: Signal<string | null>;
  submit(): void;
}

/**
 * Envio padrão: marca os campos como tocados, não envia inválido, bloqueia envio duplo, aplica os erros de validação do
 * servidor nos campos e guarda o detail de 401/409/422 para exibir dentro do formulário (sem toast).
 * A operação recebe o HttpContext que desliga o toast de 409/422: repasse-o para o CrudApiService.
 */
export function injectFormSubmit<TForm extends FormGroup, R>(
  form: TForm,
  operation: (value: ReturnType<TForm['getRawValue']>, context: HttpContext) => Observable<R>,
  onSuccess: (result: R) => void,
): FormSubmit {
  const destroyRef = inject(DestroyRef);
  const submitting = signal(false);
  const error = signal<string | null>(null);

  return {
    submitting: submitting.asReadonly(),
    error: error.asReadonly(),
    submit() {
      if (submitting()) return;
      form.markAllAsTouched();
      if (form.invalid) return;

      submitting.set(true);
      error.set(null);
      operation(form.getRawValue(), skipBusinessErrorToast())
        .pipe(
          finalize(() => submitting.set(false)),
          takeUntilDestroyed(destroyRef),
        )
        .subscribe({
          next: (result) => onSuccess(result),
          error: (err: unknown) => {
            if (!(err instanceof ApiError)) return;
            if (err.isValidation) {
              const unmatched = applyServerErrors(form, err);
              error.set(unmatched.length ? unmatched.join(' ') : null);
            } else if (err.status === 401 || err.status === 409 || err.status === 422) {
              error.set(err.detail);
            }
          },
        });
    },
  };
}
