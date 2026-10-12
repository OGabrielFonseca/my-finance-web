import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { authInterceptor } from './auth.interceptor';
import { AuthStore } from './auth.store';

describe('authInterceptor', () => {
  const token = signal<string | null>('jwt');
  let http: HttpClient;
  let backend: HttpTestingController;

  beforeEach(() => {
    token.set('jwt');
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthStore, useValue: { token } },
      ],
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  it('adiciona o Bearer nas chamadas da API', () => {
    http.get('/api/v1/accounts').subscribe();
    expect(backend.expectOne('/api/v1/accounts').request.headers.get('Authorization')).toBe('Bearer jwt');
  });

  it('não envia token para /auth/**', () => {
    http.post('/api/v1/auth/login', {}).subscribe();
    expect(backend.expectOne('/api/v1/auth/login').request.headers.has('Authorization')).toBe(false);
  });

  it('não envia token para fora da API (ex.: traduções)', () => {
    http.get('/i18n/pt-BR.json').subscribe();
    expect(backend.expectOne('/i18n/pt-BR.json').request.headers.has('Authorization')).toBe(false);
  });

  it('sem sessão não envia nada', () => {
    token.set(null);
    http.get('/api/v1/accounts').subscribe();
    expect(backend.expectOne('/api/v1/accounts').request.headers.has('Authorization')).toBe(false);
  });
});
