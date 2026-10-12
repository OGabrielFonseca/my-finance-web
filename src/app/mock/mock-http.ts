import type { FieldError, ProblemDetail } from '@shared/data/api-error';

/** Resposta de um handler do mock: status + corpo no formato da API. */
export interface MockResult {
  status: number;
  body: unknown;
}

export const ok = (body: unknown): MockResult => ({ status: 200, body });
export const created = (body: unknown): MockResult => ({ status: 201, body });
export const noContent = (): MockResult => ({ status: 204, body: null });

export function problem(status: number, code: string, detail: string, errors?: FieldError[]): MockResult {
  const body: ProblemDetail = { status, title: '', detail, code, ...(errors ? { errors } : {}) };
  return { status, body };
}

export const notFound = (): MockResult => problem(404, 'common.RESOURCE_NOT_FOUND', 'Recurso não encontrado.');
export const unauthorized = (): MockResult => problem(401, 'common.UNAUTHORIZED', 'Autenticação necessária.');
export const malformed = (): MockResult =>
  problem(400, 'common.MALFORMED_REQUEST', 'Requisição inválida. Verifique o formato dos dados enviados.');
export const businessError = (code: string, detail: string): MockResult => problem(422, code, detail);
