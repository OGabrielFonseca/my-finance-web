import type { HttpContext } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import type { Observable } from 'rxjs';
import { Subject, of, throwError } from 'rxjs';

import { ApiError } from '../data/api-error';
import { SKIP_BUSINESS_ERROR_TOAST } from '../data/http-context';
import { injectFormSubmit } from './form-submit';

describe('injectFormSubmit', () => {
  const buildForm = (name = 'Nubank') =>
    new FormGroup({ name: new FormControl(name, { nonNullable: true, validators: Validators.required }) });

  it('não envia formulário inválido e marca os campos', () => {
    const form = buildForm('');
    const operation = vi.fn(() => of(null));
    const submit = TestBed.runInInjectionContext(() => injectFormSubmit(form, operation, vi.fn()));

    submit.submit();

    expect(operation).not.toHaveBeenCalled();
    expect(form.controls.name.touched).toBe(true);
  });

  it('envia o valor com o contexto sem toast de negócio e chama onSuccess', () => {
    const form = buildForm();
    const operation = vi.fn<(value: { name: string }, context: HttpContext) => Observable<{ id: string }>>(() =>
      of({ id: '1' }),
    );
    const onSuccess = vi.fn();
    const submit = TestBed.runInInjectionContext(() => injectFormSubmit(form, operation, onSuccess));

    submit.submit();

    const [value, context] = operation.mock.lastCall ?? [];
    expect(value).toEqual({ name: 'Nubank' });
    expect(context?.get(SKIP_BUSINESS_ERROR_TOAST)).toBe(true);
    expect(onSuccess).toHaveBeenCalledWith({ id: '1' });
    expect(submit.submitting()).toBe(false);
  });

  it('bloqueia envio duplo enquanto a requisição não volta', () => {
    const pending = new Subject<null>();
    const operation = vi.fn(() => pending);
    const submit = TestBed.runInInjectionContext(() => injectFormSubmit(buildForm(), operation, vi.fn()));

    submit.submit();
    submit.submit();

    expect(operation).toHaveBeenCalledTimes(1);
    expect(submit.submitting()).toBe(true);
    pending.next(null);
    pending.complete();
    expect(submit.submitting()).toBe(false);
  });

  it('400 VALIDATION_ERROR vai para os campos', () => {
    const form = buildForm();
    const error = new ApiError(400, 'common.VALIDATION_ERROR', 'Dados inválidos.', [
      { field: 'name', message: 'muito longo' },
    ]);
    const submit = TestBed.runInInjectionContext(() => injectFormSubmit(form, () => throwError(() => error), vi.fn()));

    submit.submit();

    expect(form.controls.name.errors).toEqual({ server: 'muito longo' });
    expect(submit.error()).toBeNull();
  });

  it('422 vira erro geral do formulário', () => {
    const error = new ApiError(
      422,
      'transaction.TRANSFER_SAME_ACCOUNT',
      'Conta de origem e destino não podem ser iguais.',
    );
    const submit = TestBed.runInInjectionContext(() =>
      injectFormSubmit(buildForm(), () => throwError(() => error), vi.fn()),
    );

    submit.submit();

    expect(submit.error()).toBe('Conta de origem e destino não podem ser iguais.');
  });

  it('500 não vira erro do formulário (o interceptor já mostrou toast)', () => {
    const submit = TestBed.runInInjectionContext(() =>
      injectFormSubmit(buildForm(), () => throwError(() => new ApiError(500, 'common.INTERNAL_ERROR', 'x')), vi.fn()),
    );

    submit.submit();

    expect(submit.error()).toBeNull();
  });
});
