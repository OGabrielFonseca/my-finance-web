import type { HttpContext } from '@angular/common/http';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ApiError } from '@shared/data/api-error';
import { skipBusinessErrorToast } from '@shared/data/http-context';
import { Notifier } from '@shared/ui/notifier';

import { AuthStore } from '../auth/auth.store';
import { errorInterceptor } from './error.interceptor';

describe('errorInterceptor', () => {
  let http: HttpClient;
  let backend: HttpTestingController;
  let notifier: { error: ReturnType<typeof vi.fn>; errorKey: ReturnType<typeof vi.fn> };
  let auth: { expireSession: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    notifier = { error: vi.fn(), errorKey: vi.fn() };
    auth = { expireSession: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
        { provide: Notifier, useValue: notifier },
        { provide: AuthStore, useValue: auth },
      ],
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => backend.verify());

  /** Faz a chamada, responde com o status/corpo e devolve o erro que chegou ao chamador. */
  function call(url: string, status: number, body: object | null, context?: HttpContext): unknown {
    let received: unknown;
    http.get(url, { context }).subscribe({ error: (e: unknown) => (received = e) });
    const req = backend.expectOne(url);
    if (status === 0) req.error(new ProgressEvent('error'), { status: 0 });
    else req.flush(body, { status, statusText: 'x' });
    return received;
  }

  const problem = (status: number, code: string, detail = 'Mensagem do backend.') => ({ status, code, detail });

  it('entrega ApiError para quem chamou', () => {
    const error = call('/api/v1/x', 422, problem(422, 'transaction.TRANSFER_SAME_ACCOUNT'));
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).code).toBe('transaction.TRANSFER_SAME_ACCOUNT');
  });

  it('400 VALIDATION_ERROR: sem toast', () => {
    call('/api/v1/x', 400, { ...problem(400, 'common.VALIDATION_ERROR'), errors: [] });
    expect(notifier.error).not.toHaveBeenCalled();
    expect(notifier.errorKey).not.toHaveBeenCalled();
  });

  it('400 MALFORMED_REQUEST: toast com o detail', () => {
    call('/api/v1/x', 400, problem(400, 'common.MALFORMED_REQUEST', 'Requisição inválida.'));
    expect(notifier.error).toHaveBeenCalledWith('Requisição inválida.');
  });

  it('401 fora do /auth: expira a sessão', () => {
    call('/api/v1/accounts', 401, problem(401, 'common.UNAUTHORIZED'));
    expect(auth.expireSession).toHaveBeenCalled();
    expect(notifier.error).not.toHaveBeenCalled();
  });

  it('401 no login: não expira nem mostra toast (o formulário mostra)', () => {
    call('/api/v1/auth/login', 401, problem(401, 'auth.INVALID_CREDENTIALS'));
    expect(auth.expireSession).not.toHaveBeenCalled();
    expect(notifier.error).not.toHaveBeenCalled();
  });

  it('403 e 404: toast com o detail', () => {
    call('/api/v1/x', 404, problem(404, 'common.RESOURCE_NOT_FOUND', 'Recurso não encontrado.'));
    expect(notifier.error).toHaveBeenCalledWith('Recurso não encontrado.');
  });

  it('409/422 fora de formulário: toast com o detail', () => {
    call('/api/v1/x', 422, problem(422, 'category.SYSTEM_CATEGORY', 'Categoria de sistema.'));
    expect(notifier.error).toHaveBeenCalledWith('Categoria de sistema.');
  });

  it('409/422 com SKIP_BUSINESS_ERROR_TOAST: sem toast', () => {
    call('/api/v1/x', 409, problem(409, 'common.DATA_CONFLICT'), skipBusinessErrorToast());
    expect(notifier.error).not.toHaveBeenCalled();
  });

  it('500: toast genérico traduzido', () => {
    call('/api/v1/x', 500, problem(500, 'common.INTERNAL_ERROR'));
    expect(notifier.errorKey).toHaveBeenCalledWith('errors.unexpected');
  });

  it('falha de rede: toast de conexão', () => {
    call('/api/v1/x', 0, null);
    expect(notifier.errorKey).toHaveBeenCalledWith('errors.network');
  });
});
