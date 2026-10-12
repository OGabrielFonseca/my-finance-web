import type { StoredSession } from './auth.model';

export const SESSION_STORAGE_KEY = 'mf.session';

export function readSession(): StoredSession | null {
  try {
    const value = JSON.parse(localStorage.getItem(SESSION_STORAGE_KEY) ?? 'null') as Partial<StoredSession> | null;
    return value && typeof value.token === 'string' && typeof value.expiresAt === 'number'
      ? { token: value.token, expiresAt: value.expiresAt }
      : null;
  } catch {
    return null;
  }
}

export function writeSession(session: StoredSession): void {
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_STORAGE_KEY);
}
