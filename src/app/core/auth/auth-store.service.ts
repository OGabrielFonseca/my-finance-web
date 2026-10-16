import type { HttpContext } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { NotifierService } from '@shared/ui';
import type { Observable } from 'rxjs';
import { map, switchMap, tap } from 'rxjs';

import { AuthApiService } from './auth-api.service';
import { clearSession, readSession, writeSession } from './auth-storage';
import type { LoginRequest, RegisterRequest, StoredSession, TokenResponse, User } from './auth.model';

/** Sessão do usuário: token JWT (sem refresh), expiração automática e dados do /me. */
@Injectable({ providedIn: 'root' })
export class AuthStoreService {
  private readonly api = inject(AuthApiService);
  private readonly router = inject(Router);
  private readonly notifier = inject(NotifierService);

  private readonly session = signal<StoredSession | null>(null);
  private readonly userState = signal<User | null>(null);
  private expiryTimer?: ReturnType<typeof setTimeout>;

  readonly user = this.userState.asReadonly();
  readonly isAuthenticated = computed(() => this.session() !== null);
  readonly token = computed(() => this.session()?.token ?? null);

  /** Chamado uma vez na inicialização do app. Não faz requisição no construtor para evitar ciclo com os interceptors. */
  restoreSession(now = Date.now()): void {
    const stored = readSession();
    if (!stored || stored.expiresAt <= now) {
      clearSession();
      return;
    }
    this.start(stored, now);
    this.loadUser().subscribe({ error: () => undefined });
  }

  login(credentials: LoginRequest, context?: HttpContext): Observable<void> {
    return this.api.login(credentials, context).pipe(switchMap((token) => this.startFromToken(token)));
  }

  register(data: RegisterRequest, context?: HttpContext): Observable<void> {
    return this.api.register(data, context).pipe(switchMap((token) => this.startFromToken(token)));
  }

  loginWithGoogle(idToken: string, context?: HttpContext): Observable<void> {
    return this.api.google({ idToken }, context).pipe(switchMap((token) => this.startFromToken(token)));
  }

  logout(): void {
    this.end();
    void this.router.navigateByUrl('/login');
  }

  /** Token expirado ou recusado pela API (401): encerra a sessão e volta ao login guardando a tela atual. */
  expireSession(): void {
    if (!this.session()) return;
    this.end();
    this.notifier.error('Sua sessão expirou. Entre novamente.');
    void this.router.navigate(['/login'], { queryParams: { returnUrl: this.router.url } });
  }

  /** Substitui o usuário carregado (ex.: depois de editar o perfil), sem nova chamada ao /me. */
  setUser(user: User): void {
    this.userState.set(user);
  }

  private startFromToken(token: TokenResponse): Observable<void> {
    const now = Date.now();
    const session: StoredSession = { token: token.accessToken, expiresAt: now + token.expiresIn * 1000 };
    writeSession(session);
    this.start(session, now);
    return this.loadUser();
  }

  private loadUser(): Observable<void> {
    return this.api.me().pipe(
      tap((user) => this.userState.set(user)),
      map(() => undefined),
    );
  }

  private start(session: StoredSession, now: number): void {
    this.session.set(session);
    clearTimeout(this.expiryTimer);
    this.expiryTimer = setTimeout(() => this.expireSession(), session.expiresAt - now);
  }

  private end(): void {
    clearTimeout(this.expiryTimer);
    clearSession();
    this.session.set(null);
    this.userState.set(null);
  }
}
