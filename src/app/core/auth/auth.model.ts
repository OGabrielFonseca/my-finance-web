import type { ApiResponse, ApiSchema } from '@api/api-types';

export type LoginRequest = ApiSchema<'LoginRequest'>;
export type RegisterRequest = ApiSchema<'RegisterRequest'>;
export type TokenResponse = ApiResponse<'TokenResponse'>;
export type User = ApiResponse<'UserResponse'>;

/** Sessão guardada no localStorage: o token e o instante (epoch ms) em que expira. */
export interface StoredSession {
  token: string;
  expiresAt: number;
}
