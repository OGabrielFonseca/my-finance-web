import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { NotifierService } from '@shared/ui';

import { SESSION_STORAGE_KEY, readSession, writeSession } from './auth-storage';
import { AuthStoreService } from './auth-store.service';

const user = { id: 'u1', name: 'Gabriel', email: 'demo@myfinance.dev', createdAt: '', updatedAt: '' };

describe('AuthStoreService', () => {
  let http: HttpTestingController;
  let notifier: { errorKey: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    localStorage.clear();
    notifier = { errorKey: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: NotifierService, useValue: notifier },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
  });

  afterEach(() => {
    http.verify();
    vi.useRealTimers();
  });

  it('login grava a sessão com a expiração e carrega o usuário', () => {
    vi.useFakeTimers({ now: new Date(2026, 9, 12, 10, 0) });
    const store = TestBed.inject(AuthStoreService);
    let done = false;

    store.login({ email: 'demo@myfinance.dev', password: '12345678' }).subscribe(() => (done = true));
    http.expectOne('/api/v1/auth/login').flush({ accessToken: 'jwt', tokenType: 'Bearer', expiresIn: 3600 });
    http.expectOne('/api/v1/me').flush(user);

    expect(done).toBe(true);
    expect(store.isAuthenticated()).toBe(true);
    expect(store.token()).toBe('jwt');
    expect(store.user()?.name).toBe('Gabriel');
    expect(readSession()).toEqual({ token: 'jwt', expiresAt: Date.now() + 3600 * 1000 });
  });

  it('restoreSession descarta sessão expirada', () => {
    writeSession({ token: 'old', expiresAt: 1000 });
    const store = TestBed.inject(AuthStoreService);

    store.restoreSession(2000);

    expect(store.isAuthenticated()).toBe(false);
    expect(localStorage.getItem(SESSION_STORAGE_KEY)).toBeNull();
  });

  it('restoreSession reaproveita sessão válida e carrega o usuário', () => {
    writeSession({ token: 'jwt', expiresAt: Date.now() + 60_000 });
    const store = TestBed.inject(AuthStoreService);

    store.restoreSession();
    http.expectOne('/api/v1/me').flush(user);

    expect(store.token()).toBe('jwt');
    expect(store.user()?.email).toBe('demo@myfinance.dev');
  });

  it('expira a sessão no horário do token e volta ao login com returnUrl', () => {
    vi.useFakeTimers();
    writeSession({ token: 'jwt', expiresAt: Date.now() + 5_000 });
    const store = TestBed.inject(AuthStoreService);
    store.restoreSession();
    http.expectOne('/api/v1/me').flush(user);

    vi.advanceTimersByTime(5_000);

    expect(store.isAuthenticated()).toBe(false);
    expect(notifier.errorKey).toHaveBeenCalledWith('errors.sessionExpired');
    expect(TestBed.inject(Router).navigate).toHaveBeenCalledWith(['/login'], { queryParams: { returnUrl: '/' } });
  });

  it('logout limpa a sessão sem avisar de expiração', () => {
    writeSession({ token: 'jwt', expiresAt: Date.now() + 60_000 });
    const store = TestBed.inject(AuthStoreService);
    store.restoreSession();
    http.expectOne('/api/v1/me').flush(user);

    store.logout();

    expect(store.isAuthenticated()).toBe(false);
    expect(store.user()).toBeNull();
    expect(notifier.errorKey).not.toHaveBeenCalled();
    expect(localStorage.getItem(SESSION_STORAGE_KEY)).toBeNull();
  });
});
