import { HttpErrorResponse } from '@angular/common/http';

import { ApiError, NETWORK_ERROR, UNKNOWN_ERROR, toApiError } from './api-error';

describe('toApiError', () => {
  it('converte ProblemDetail', () => {
    const error = toApiError(
      new HttpErrorResponse({
        status: 400,
        error: {
          status: 400,
          code: 'common.VALIDATION_ERROR',
          detail: 'Dados inválidos.',
          errors: [{ field: 'name', message: 'não deve estar em branco' }],
        },
      }),
    );
    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(400);
    expect(error.isValidation).toBe(true);
    expect(error.detail).toBe('Dados inválidos.');
    expect(error.fieldErrors).toEqual([{ field: 'name', message: 'não deve estar em branco' }]);
  });

  it('status 0 é erro de rede', () => {
    expect(toApiError(new HttpErrorResponse({ status: 0 })).code).toBe(NETWORK_ERROR);
  });

  it('corpo sem code vira erro desconhecido', () => {
    const error = toApiError(new HttpErrorResponse({ status: 502, error: '<html>Bad Gateway</html>' }));
    expect([error.status, error.code, error.detail]).toEqual([502, UNKNOWN_ERROR, '']);
  });
});
