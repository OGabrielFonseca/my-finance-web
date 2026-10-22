import type { HttpErrorResponse } from '@angular/common/http';

export interface FieldError {
  field: string;
  message: string;
}

/** Corpo de erro da API (RFC 9457 + code + errors). */
export interface ProblemDetail {
  status: number;
  title?: string;
  detail: string;
  code: string;
  errors?: FieldError[];
  /** Pedido P5 ao backend: item que falhou numa aprovação em lote. */
  itemId?: string;
}

export const VALIDATION_ERROR = 'common.VALIDATION_ERROR';
export const NETWORK_ERROR = 'network';
export const UNKNOWN_ERROR = 'unknown';

/** Erro de API já normalizado. O comportamento é decidido pelo code; o texto exibido é o detail. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    readonly detail: string,
    readonly fieldErrors: readonly FieldError[] = [],
    /** Item que falhou numa aprovação em lote (null quando a API não informa). */
    readonly itemId: string | null = null,
  ) {
    super(code);
    this.name = 'ApiError';
  }

  get isValidation(): boolean {
    return this.code === VALIDATION_ERROR;
  }
}

export function toApiError(error: HttpErrorResponse): ApiError {
  if (error.status === 0) return new ApiError(0, NETWORK_ERROR, '');
  const body: unknown = error.error;
  if (isProblemDetail(body))
    return new ApiError(error.status, body.code, body.detail ?? '', body.errors ?? [], body.itemId ?? null);
  return new ApiError(error.status, UNKNOWN_ERROR, '');
}

function isProblemDetail(body: unknown): body is ProblemDetail {
  return typeof body === 'object' && body !== null && typeof (body as Partial<ProblemDetail>).code === 'string';
}
