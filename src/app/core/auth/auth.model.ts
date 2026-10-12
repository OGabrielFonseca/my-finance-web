export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

export interface TokenResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

/** Sessão guardada no localStorage: o token e o instante (epoch ms) em que expira. */
export interface StoredSession {
  token: string;
  expiresAt: number;
}
