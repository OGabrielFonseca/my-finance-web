import { noContent, ok, created, problem } from '../mock-http';
import type { MockRoute } from '../mock-router';
import type { TokenResponse } from '../mock-types';
import { validate } from '../mock-validation';

const token = (): TokenResponse => ({ accessToken: 'mock-token', tokenType: 'Bearer', expiresIn: 24 * 60 * 60 });

export const authRoutes: MockRoute[] = [
  {
    method: 'POST',
    pattern: '/auth/login',
    public: true,
    handler: (req) => {
      const invalid = validate(req.body, { email: ['required'], password: ['required'] });
      if (invalid) return invalid;
      // Gatilho do protótipo: a senha "errada" simula credenciais inválidas.
      if ((req.body as { password: string }).password === 'errada') {
        return problem(401, 'auth.INVALID_CREDENTIALS', 'E-mail ou senha inválidos.');
      }
      return ok(token());
    },
  },
  {
    method: 'POST',
    pattern: '/auth/register',
    public: true,
    handler: (req, db) => {
      const invalid = validate(req.body, {
        name: ['required', { maxLength: 120 }],
        email: ['required', { maxLength: 254 }],
        password: ['required', { minLength: 8 }, { maxLength: 72 }],
      });
      if (invalid) return invalid;
      const { name, email } = req.body as { name: string; email: string };
      db.user = { ...db.user, name, email, updatedAt: new Date().toISOString() };
      return created(token());
    },
  },
  { method: 'GET', pattern: '/me', handler: (_req, db) => ok(db.user) },
  {
    method: 'PUT',
    pattern: '/me',
    handler: (req, db) => {
      const invalid = validate(req.body, { name: ['required', { maxLength: 120 }], email: ['required'] });
      if (invalid) return invalid;
      db.user = { ...db.user, ...(req.body as { name: string; email: string }), updatedAt: new Date().toISOString() };
      return ok(db.user);
    },
  },
  {
    // Só existe no mock: o botão "Expirar sessão" do menu do usuário chama esta rota.
    method: 'POST',
    pattern: '/__mock/expire-session',
    handler: (_req, db) => {
      db.sessionExpired = true;
      return noContent();
    },
  },
];
