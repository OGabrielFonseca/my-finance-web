# Fase 0b.1: Camada base — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir a camada reutilizável (dados, erros, autenticação, interceptors, CRUD genérico, formulários e componentes de UI) sobre a fundação da fase 0a, toda testada.

**Architecture:** `shared/` não conhece `core/` nem `features/`; `core/` usa `shared/`. Contratos da API (`PageResponse`, `ApiError`) ficam em `shared/data`. O estado das listagens é uma função de injeção (`injectCrudList`) baseada em signals e sincronizada com a URL. Tabela e filtros são componentes declarativos sobre o PrimeNG. Erros HTTP viram `ApiError` num interceptor que decide o comportamento pelo status/código.

**Tech Stack:** Angular 21 (signals, zoneless), PrimeNG 21 (`p-table`, `p-select`, `p-datepicker`, `p-drawer`, `DynamicDialog`, `ConfirmDialog`, `Toast`), Transloco 8, RxJS 7, Vitest 4.

**Spec:** `docs/superpowers/specs/2026-10-12-fundacao-e-prototipo-design.md` (referência: `docs/escopo-frontend.md` v0.2, seções 4 e 5)

**Sequência dos planos:** 2º de 4. Depende de `2026-10-12-fase-0a-fundacao.md` concluído. Depois: `2026-10-12-fase-0b2-api-mock.md`, `2026-10-12-fase-0b3-telas.md`.

## Global Constraints

- Todas as regras de `2026-10-12-fase-0a-fundacao.md` (Global Constraints) continuam valendo.
- `shared/**` **não importa** de `core/**` nem de `features/**`. `core/**` pode importar de `shared/**`.
- Chaves i18n usadas aqui já existem em `public/i18n/pt-BR.json` (criado na fase 0a). Não adicionar texto fixo em template.
- Testes com `npm test -- --watch=false`. Os specs usam os globais do Vitest (`describe`, `it`, `expect`, `vi`); efeitos de signals são disparados com `TestBed.tick()`.
- Commits por task, em português, terminando com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

**Decisões deste plano que ajustam o escopo** (o plano 0b3 atualiza o `escopo-frontend.md` no fim):
- `ApiError`/`ProblemDetail` ficam em `shared/data/api-error.ts` (não em `core/http`), para `shared/forms` poder usá-los sem depender de `core`.
- O token de contexto se chama `SKIP_BUSINESS_ERROR_TOAST` e só desliga o toast de 409/422; `injectFormSubmit` o envia automaticamente.
- `injectFormSubmit(form, operation, onSuccess)`: o callback de sucesso é o 3º argumento (sem encadeamento `.onSuccess`).
- O rodapé do formulário é `<app-form-footer>` (fica **dentro** do `<form [formGroup]>` da feature, porque `formControlName` precisa do `FormGroupDirective` no template da própria feature).
- Ações de linha da tabela são declaradas como `RowActionDef[]` e chegam num único output `(action)` com `{ id, row }`.
- Sem pipes próprios de dinheiro/data: `LOCALE_ID = pt-BR` + `DEFAULT_CURRENCY_CODE = BRL` fazem `| currency` e `| date` saírem certos.
- `CrudApi.delete`/`archive` devolvem `Observable<null>` (o HttpClient entrega `null` no 204; `void` como argumento genérico é barrado pelo lint).

---

### Task 1: Contratos e utilitários de dados (`shared/data`)

**Files:**
- Create: `src/app/shared/data/dates.ts`, `src/app/shared/data/dates.spec.ts`
- Create: `src/app/shared/data/page.ts`
- Create: `src/app/shared/data/http-params.ts`, `src/app/shared/data/http-params.spec.ts`
- Create: `src/app/shared/data/api-error.ts`, `src/app/shared/data/api-error.spec.ts`
- Create: `src/app/shared/data/http-context.ts`

**Interfaces:**
- Produces:
  - `type LocalDate = string`, `type YearMonth = string`; `toLocalDate(d: Date): LocalDate`, `fromLocalDate(s: LocalDate): Date`, `toYearMonth(d: Date): YearMonth`, `fromYearMonth(s: YearMonth): Date`
  - `interface PageResponse<T> { items: T[]; page; size; totalItems; totalPages }`, `interface SortSpec { field; direction: 'asc' | 'desc' }`, `interface PageRequest { page; size; sort? }`, `DEFAULT_PAGE_SIZE = 20`, `MAX_PAGE_SIZE = 100`, `samePageRequest(a, b): boolean`
  - `toHttpParams(filter?: object, page?: PageRequest): HttpParams`
  - `interface FieldError`, `interface ProblemDetail`, `class ApiError { status; code; detail; fieldErrors; isValidation }`, `toApiError(e: HttpErrorResponse): ApiError`, constantes `VALIDATION_ERROR`, `NETWORK_ERROR`, `UNKNOWN_ERROR`
  - `SKIP_BUSINESS_ERROR_TOAST: HttpContextToken<boolean>`, `skipBusinessErrorToast(): HttpContext`

- [ ] **Step 1: Escrever os testes**

Create `src/app/shared/data/dates.spec.ts`:
```ts
import { fromLocalDate, fromYearMonth, toLocalDate, toYearMonth } from './dates';

describe('dates', () => {
  it('toLocalDate usa a data local, não UTC (lançamento às 23h continua no mesmo dia)', () => {
    expect(toLocalDate(new Date(2026, 9, 12, 23, 30))).toBe('2026-10-12');
  });

  it('toLocalDate completa com zeros', () => {
    expect(toLocalDate(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  it('fromLocalDate cria meia-noite local', () => {
    const date = fromLocalDate('2026-10-12');
    expect([date.getFullYear(), date.getMonth(), date.getDate(), date.getHours()]).toEqual([2026, 9, 12, 0]);
  });

  it('ida e volta preserva a data', () => {
    expect(toLocalDate(fromLocalDate('2026-02-28'))).toBe('2026-02-28');
  });

  it('toYearMonth e fromYearMonth', () => {
    expect(toYearMonth(new Date(2026, 8, 30, 23, 59))).toBe('2026-09');
    expect(toLocalDate(fromYearMonth('2026-09'))).toBe('2026-09-01');
  });
});
```

Create `src/app/shared/data/http-params.spec.ts`:
```ts
import { toHttpParams } from './http-params';

describe('toHttpParams', () => {
  it('ignora null, undefined e string vazia', () => {
    const params = toHttpParams({ name: '', type: null, archived: undefined, accountId: 'a1' });
    expect(params.keys()).toEqual(['accountId']);
  });

  it('mantém false e zero', () => {
    const params = toHttpParams({ archived: false, amount: 0 });
    expect(params.get('archived')).toBe('false');
    expect(params.get('amount')).toBe('0');
  });

  it('converte Date em LocalDate', () => {
    expect(toHttpParams({ from: new Date(2026, 9, 12, 23, 0) }).get('from')).toBe('2026-10-12');
  });

  it('adiciona página, tamanho e ordenação', () => {
    const params = toHttpParams({}, { page: 2, size: 50, sort: { field: 'transactionDate', direction: 'desc' } });
    expect(params.toString()).toBe('page=2&size=50&sort=transactionDate,desc');
  });

  it('sem ordenação não envia sort', () => {
    expect(toHttpParams({}, { page: 0, size: 20 }).has('sort')).toBe(false);
  });
});
```

Create `src/app/shared/data/api-error.spec.ts`:
```ts
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
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test -- --watch=false`
Expected: FAIL (módulos `./dates`, `./http-params`, `./api-error` não encontrados).

- [ ] **Step 3: Implementar**

Create `src/app/shared/data/dates.ts`:
```ts
/** Data sem fuso, como o LocalDate do backend: 'YYYY-MM-DD'. */
export type LocalDate = string;
/** Mês sem fuso, como o YearMonth do backend: 'YYYY-MM'. */
export type YearMonth = string;

const pad = (value: number) => String(value).padStart(2, '0');

/** Nunca use toISOString() para datas da API: ele converte para UTC e pode mudar o dia. */
export function toLocalDate(date: Date): LocalDate {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function fromLocalDate(value: LocalDate): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function toYearMonth(date: Date): YearMonth {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
}

export function fromYearMonth(value: YearMonth): Date {
  const [year, month] = value.split('-').map(Number);
  return new Date(year, month - 1, 1);
}
```

Create `src/app/shared/data/page.ts`:
```ts
/** Espelha o PageResponse do backend. */
export interface PageResponse<T> {
  items: T[];
  page: number; // começa em 0
  size: number;
  totalItems: number;
  totalPages: number;
}

export interface SortSpec {
  field: string; // atributo da ENTIDADE no backend (ex.: 'transactionDate')
  direction: 'asc' | 'desc';
}

export interface PageRequest {
  page: number;
  size: number;
  sort?: SortSpec;
}

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export function samePageRequest(a: PageRequest, b: PageRequest): boolean {
  return (
    a.page === b.page && a.size === b.size && a.sort?.field === b.sort?.field && a.sort?.direction === b.sort?.direction
  );
}
```

Create `src/app/shared/data/http-params.ts`:
```ts
import { HttpParams } from '@angular/common/http';

import { toLocalDate } from './dates';
import type { PageRequest } from './page';

/** Filtro → query params, ignorando vazios. As chaves do filtro têm o mesmo nome dos params da API. */
export function toHttpParams(filter: object = {}, page?: PageRequest): HttpParams {
  let params = new HttpParams();
  for (const [key, value] of Object.entries(filter)) {
    if (value === null || value === undefined || value === '') continue;
    params = params.set(key, serialize(value));
  }
  if (page) {
    params = params.set('page', page.page).set('size', page.size);
    if (page.sort) params = params.set('sort', `${page.sort.field},${page.sort.direction}`);
  }
  return params;
}

function serialize(value: unknown): string {
  return value instanceof Date ? toLocalDate(value) : String(value);
}
```

Create `src/app/shared/data/api-error.ts`:
```ts
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
  if (isProblemDetail(body)) return new ApiError(error.status, body.code, body.detail ?? '', body.errors ?? []);
  return new ApiError(error.status, UNKNOWN_ERROR, '');
}

function isProblemDetail(body: unknown): body is ProblemDetail {
  return typeof body === 'object' && body !== null && typeof (body as Partial<ProblemDetail>).code === 'string';
}
```

Create `src/app/shared/data/http-context.ts`:
```ts
import { HttpContext, HttpContextToken } from '@angular/common/http';

/**
 * Quando true, o errorInterceptor não mostra toast para 409/422: quem chamou exibe o erro (ex.: formulário em diálogo).
 * Os demais status continuam com o comportamento padrão.
 */
export const SKIP_BUSINESS_ERROR_TOAST = new HttpContextToken<boolean>(() => false);

export function skipBusinessErrorToast(): HttpContext {
  return new HttpContext().set(SKIP_BUSINESS_ERROR_TOAST, true);
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test -- --watch=false`
Expected: PASS (dates 5, http-params 5, api-error 3, mais os da fase 0a).

- [ ] **Step 5: Commit**

```bash
git add src/app/shared/data
git commit -m "feat(shared): adiciona contratos de paginação, datas sem fuso e ApiError

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Notificações e autenticação (`AuthStore`, `authInterceptor`, guards)

**Files:**
- Create: `src/app/shared/ui/notifier.ts`
- Create: `src/app/core/auth/auth.model.ts`, `src/app/core/auth/auth-storage.ts`, `src/app/core/auth/auth.api.ts`
- Create: `src/app/core/auth/auth.store.ts`, `src/app/core/auth/auth.store.spec.ts`
- Create: `src/app/core/auth/auth.interceptor.ts`, `src/app/core/auth/auth.interceptor.spec.ts`
- Create: `src/app/core/auth/auth.guards.ts`, `src/app/core/auth/auth.providers.ts`

**Interfaces:**
- Consumes: `ApiResponse`, `ApiSchema` (`@api/api-types`, fase 0a); `environment.apiUrl`.
- Produces:
  - `Notifier` (root): `success(key: string, params?: Record<string, unknown>)`, `error(detail: string)`, `errorKey(key: string)`. Depende de `MessageService` (registrado na Task 3).
  - Tipos `LoginRequest`, `RegisterRequest`, `TokenResponse`, `User`, `StoredSession { token; expiresAt }`
  - `AuthApi`: `login(body, context?)`, `register(body, context?)`, `me()`
  - `AuthStore` (root): `user: Signal<User | null>`, `isAuthenticated: Signal<boolean>`, `token: Signal<string | null>`, `restoreSession(now?)`, `login(credentials, context?): Observable<void>`, `register(data, context?): Observable<void>`, `logout()`, `expireSession()`
  - `authInterceptor`, `authGuard`, `guestGuard`, `provideAuth()`

- [ ] **Step 1: Notifier e tipos**

Create `src/app/shared/ui/notifier.ts`:
```ts
import { Injectable, inject } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { MessageService } from 'primeng/api';

/** Toasts padronizados. Sucesso recebe chave i18n; erro recebe o texto já pronto (normalmente o detail da API). */
@Injectable({ providedIn: 'root' })
export class Notifier {
  private readonly messages = inject(MessageService);
  private readonly transloco = inject(TranslocoService);

  success(key: string, params?: Record<string, unknown>): void {
    this.messages.add({ severity: 'success', summary: this.transloco.translate(key, params), life: 3000 });
  }

  error(detail: string): void {
    this.messages.add({ severity: 'error', summary: this.transloco.translate('errors.title'), detail, life: 6000 });
  }

  errorKey(key: string): void {
    this.error(this.transloco.translate(key));
  }
}
```

Create `src/app/core/auth/auth.model.ts`:
```ts
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
```

Create `src/app/core/auth/auth-storage.ts`:
```ts
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
```

Create `src/app/core/auth/auth.api.ts`:
```ts
import type { HttpContext } from '@angular/common/http';
import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '@env/environment';
import type { Observable } from 'rxjs';

import type { LoginRequest, RegisterRequest, TokenResponse, User } from './auth.model';

@Injectable({ providedIn: 'root' })
export class AuthApi {
  private readonly http = inject(HttpClient);

  login(body: LoginRequest, context?: HttpContext): Observable<TokenResponse> {
    return this.http.post<TokenResponse>(`${environment.apiUrl}/auth/login`, body, { context });
  }

  register(body: RegisterRequest, context?: HttpContext): Observable<TokenResponse> {
    return this.http.post<TokenResponse>(`${environment.apiUrl}/auth/register`, body, { context });
  }

  me(): Observable<User> {
    return this.http.get<User>(`${environment.apiUrl}/me`);
  }
}
```

- [ ] **Step 2: Escrever os testes do `AuthStore` e do `authInterceptor`**

Create `src/app/core/auth/auth.store.spec.ts`:
```ts
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { Notifier } from '@shared/ui/notifier';

import { SESSION_STORAGE_KEY, readSession, writeSession } from './auth-storage';
import { AuthStore } from './auth.store';

const user = { id: 'u1', name: 'Gabriel', email: 'demo@myfinance.dev', createdAt: '', updatedAt: '' };

describe('AuthStore', () => {
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
        { provide: Notifier, useValue: notifier },
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
    const store = TestBed.inject(AuthStore);
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
    const store = TestBed.inject(AuthStore);

    store.restoreSession(2000);

    expect(store.isAuthenticated()).toBe(false);
    expect(localStorage.getItem(SESSION_STORAGE_KEY)).toBeNull();
  });

  it('restoreSession reaproveita sessão válida e carrega o usuário', () => {
    writeSession({ token: 'jwt', expiresAt: Date.now() + 60_000 });
    const store = TestBed.inject(AuthStore);

    store.restoreSession();
    http.expectOne('/api/v1/me').flush(user);

    expect(store.token()).toBe('jwt');
    expect(store.user()?.email).toBe('demo@myfinance.dev');
  });

  it('expira a sessão no horário do token e volta ao login com returnUrl', () => {
    vi.useFakeTimers();
    writeSession({ token: 'jwt', expiresAt: Date.now() + 5_000 });
    const store = TestBed.inject(AuthStore);
    store.restoreSession();
    http.expectOne('/api/v1/me').flush(user);

    vi.advanceTimersByTime(5_000);

    expect(store.isAuthenticated()).toBe(false);
    expect(notifier.errorKey).toHaveBeenCalledWith('errors.sessionExpired');
    expect(TestBed.inject(Router).navigate).toHaveBeenCalledWith(['/login'], { queryParams: { returnUrl: '/' } });
  });

  it('logout limpa a sessão sem avisar de expiração', () => {
    writeSession({ token: 'jwt', expiresAt: Date.now() + 60_000 });
    const store = TestBed.inject(AuthStore);
    store.restoreSession();
    http.expectOne('/api/v1/me').flush(user);

    store.logout();

    expect(store.isAuthenticated()).toBe(false);
    expect(store.user()).toBeNull();
    expect(notifier.errorKey).not.toHaveBeenCalled();
    expect(localStorage.getItem(SESSION_STORAGE_KEY)).toBeNull();
  });
});
```

Create `src/app/core/auth/auth.interceptor.spec.ts`:
```ts
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
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `npm test -- --watch=false`
Expected: FAIL (`./auth.store` e `./auth.interceptor` não encontrados).

- [ ] **Step 4: Implementar store, interceptor, guards e provider**

Create `src/app/core/auth/auth.store.ts`:
```ts
import type { HttpContext } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Notifier } from '@shared/ui/notifier';
import type { Observable } from 'rxjs';
import { map, switchMap, tap } from 'rxjs';

import { AuthApi } from './auth.api';
import { clearSession, readSession, writeSession } from './auth-storage';
import type { LoginRequest, RegisterRequest, StoredSession, TokenResponse, User } from './auth.model';

/** Sessão do usuário: token JWT (sem refresh), expiração automática e dados do /me. */
@Injectable({ providedIn: 'root' })
export class AuthStore {
  private readonly api = inject(AuthApi);
  private readonly router = inject(Router);
  private readonly notifier = inject(Notifier);

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

  logout(): void {
    this.end();
    void this.router.navigateByUrl('/login');
  }

  /** Token expirado ou recusado pela API (401): encerra a sessão e volta ao login guardando a tela atual. */
  expireSession(): void {
    if (!this.session()) return;
    this.end();
    this.notifier.errorKey('errors.sessionExpired');
    void this.router.navigate(['/login'], { queryParams: { returnUrl: this.router.url } });
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
```

Create `src/app/core/auth/auth.interceptor.ts`:
```ts
import type { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { environment } from '@env/environment';

import { AuthStore } from './auth.store';

/** Adiciona o Bearer nas chamadas para a API, exceto /auth/**. */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = inject(AuthStore).token();
  const isApi = req.url.startsWith(environment.apiUrl);
  const isAuthEndpoint = req.url.startsWith(`${environment.apiUrl}/auth/`);
  if (!token || !isApi || isAuthEndpoint) return next(req);
  return next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
};
```

Create `src/app/core/auth/auth.guards.ts`:
```ts
import { inject } from '@angular/core';
import type { CanActivateFn } from '@angular/router';
import { Router } from '@angular/router';

import { AuthStore } from './auth.store';

/** Rotas internas: sem sessão vai para o login, guardando a URL pedida. */
export const authGuard: CanActivateFn = (_route, state) =>
  inject(AuthStore).isAuthenticated() ||
  inject(Router).createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });

/** Login/cadastro: quem já está logado vai para o dashboard. */
export const guestGuard: CanActivateFn = () =>
  !inject(AuthStore).isAuthenticated() || inject(Router).createUrlTree(['/dashboard']);
```

Create `src/app/core/auth/auth.providers.ts`:
```ts
import type { EnvironmentProviders } from '@angular/core';
import { inject, provideAppInitializer } from '@angular/core';

import { AuthStore } from './auth.store';

/** Restaura a sessão salva antes da primeira navegação (os guards dependem dela). */
export function provideAuth(): EnvironmentProviders {
  return provideAppInitializer(() => inject(AuthStore).restoreSession());
}
```

- [ ] **Step 5: Rodar e ver passar**

Run: `npm test -- --watch=false`
Expected: PASS (AuthStore 5, authInterceptor 4).

- [ ] **Step 6: Commit**

```bash
git add src/app/shared/ui/notifier.ts src/app/core/auth
git commit -m "feat(core): adiciona AuthStore, interceptor de token e guards

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: `errorInterceptor`, `languageInterceptor` e registro no app

**Files:**
- Create: `src/app/core/http/error.interceptor.ts`, `src/app/core/http/error.interceptor.spec.ts`, `src/app/core/http/language.interceptor.ts`
- Modify: `src/app/app.config.ts`, `src/app/app.ts`, `angular.json`

**Interfaces:**
- Consumes: `toApiError`, `SKIP_BUSINESS_ERROR_TOAST` (Task 1); `Notifier`, `AuthStore`, `authInterceptor`, `provideAuth` (Task 2); `provideI18n` (fase 0a).
- Produces: `errorInterceptor` (todo erro HTTP chega ao chamador como `ApiError`), `languageInterceptor`; `MessageService`, `ConfirmationService`, `DialogService` registrados na raiz; `<p-toast>` e `<p-confirmdialog>` no `App`.

Comportamento do `errorInterceptor` (escopo §5.2):

| Situação | Comportamento |
|---|---|
| status 0 | toast `errors.network` |
| ≥ 500 | toast `errors.unexpected` |
| 401 fora de `/auth/**` | `AuthStore.expireSession()` (que avisa e manda para o login) |
| 401 em `/auth/**` | nada (o formulário de login mostra o `detail`) |
| 400 `common.VALIDATION_ERROR` | nada (erros vão para os campos) |
| 409/422 com `SKIP_BUSINESS_ERROR_TOAST` | nada (o formulário mostra) |
| demais (400, 403, 404, 409, 422) | toast com o `detail`; 400 também loga no console em dev |

- [ ] **Step 1: Escrever o teste**

Create `src/app/core/http/error.interceptor.spec.ts`:
```ts
import type { HttpContext } from '@angular/common/http';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ApiError } from '@shared/data/api-error';
import { skipBusinessErrorToast } from '@shared/data/http-context';
import { Notifier } from '@shared/ui/notifier';

import { AuthStore } from '../auth/auth.store';
import { errorInterceptor } from './error.interceptor';

describe('errorInterceptor', () => {
  let http: HttpClient;
  let backend: HttpTestingController;
  let notifier: { error: ReturnType<typeof vi.fn>; errorKey: ReturnType<typeof vi.fn> };
  let auth: { expireSession: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    notifier = { error: vi.fn(), errorKey: vi.fn() };
    auth = { expireSession: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
        { provide: Notifier, useValue: notifier },
        { provide: AuthStore, useValue: auth },
      ],
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => backend.verify());

  /** Faz a chamada, responde com o status/corpo e devolve o erro que chegou ao chamador. */
  function call(url: string, status: number, body: object | null, context?: HttpContext): unknown {
    let received: unknown;
    http.get(url, { context }).subscribe({ error: (e: unknown) => (received = e) });
    const req = backend.expectOne(url);
    if (status === 0) req.error(new ProgressEvent('error'), { status: 0 });
    else req.flush(body, { status, statusText: 'x' });
    return received;
  }

  const problem = (status: number, code: string, detail = 'Mensagem do backend.') => ({ status, code, detail });

  it('entrega ApiError para quem chamou', () => {
    const error = call('/api/v1/x', 422, problem(422, 'transaction.TRANSFER_SAME_ACCOUNT'));
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).code).toBe('transaction.TRANSFER_SAME_ACCOUNT');
  });

  it('400 VALIDATION_ERROR: sem toast', () => {
    call('/api/v1/x', 400, { ...problem(400, 'common.VALIDATION_ERROR'), errors: [] });
    expect(notifier.error).not.toHaveBeenCalled();
    expect(notifier.errorKey).not.toHaveBeenCalled();
  });

  it('400 MALFORMED_REQUEST: toast com o detail', () => {
    call('/api/v1/x', 400, problem(400, 'common.MALFORMED_REQUEST', 'Requisição inválida.'));
    expect(notifier.error).toHaveBeenCalledWith('Requisição inválida.');
  });

  it('401 fora do /auth: expira a sessão', () => {
    call('/api/v1/accounts', 401, problem(401, 'common.UNAUTHORIZED'));
    expect(auth.expireSession).toHaveBeenCalled();
    expect(notifier.error).not.toHaveBeenCalled();
  });

  it('401 no login: não expira nem mostra toast (o formulário mostra)', () => {
    call('/api/v1/auth/login', 401, problem(401, 'auth.INVALID_CREDENTIALS'));
    expect(auth.expireSession).not.toHaveBeenCalled();
    expect(notifier.error).not.toHaveBeenCalled();
  });

  it('403 e 404: toast com o detail', () => {
    call('/api/v1/x', 404, problem(404, 'common.RESOURCE_NOT_FOUND', 'Recurso não encontrado.'));
    expect(notifier.error).toHaveBeenCalledWith('Recurso não encontrado.');
  });

  it('409/422 fora de formulário: toast com o detail', () => {
    call('/api/v1/x', 422, problem(422, 'category.SYSTEM_CATEGORY', 'Categoria de sistema.'));
    expect(notifier.error).toHaveBeenCalledWith('Categoria de sistema.');
  });

  it('409/422 com SKIP_BUSINESS_ERROR_TOAST: sem toast', () => {
    call('/api/v1/x', 409, problem(409, 'common.DATA_CONFLICT'), skipBusinessErrorToast());
    expect(notifier.error).not.toHaveBeenCalled();
  });

  it('500: toast genérico traduzido', () => {
    call('/api/v1/x', 500, problem(500, 'common.INTERNAL_ERROR'));
    expect(notifier.errorKey).toHaveBeenCalledWith('errors.unexpected');
  });

  it('falha de rede: toast de conexão', () => {
    call('/api/v1/x', 0, null);
    expect(notifier.errorKey).toHaveBeenCalledWith('errors.network');
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test -- --watch=false`
Expected: FAIL (`./error.interceptor` não encontrado).

- [ ] **Step 3: Implementar os interceptors**

Create `src/app/core/http/error.interceptor.ts`:
```ts
import type { HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { HttpErrorResponse } from '@angular/common/http';
import { inject, isDevMode } from '@angular/core';
import { environment } from '@env/environment';
import type { ApiError } from '@shared/data/api-error';
import { toApiError } from '@shared/data/api-error';
import { SKIP_BUSINESS_ERROR_TOAST } from '@shared/data/http-context';
import { Notifier } from '@shared/ui/notifier';
import { catchError, throwError } from 'rxjs';

import { AuthStore } from '../auth/auth.store';

/** Converte HttpErrorResponse em ApiError e aplica o comportamento padrão por status (escopo §5.2). */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const notifier = inject(Notifier);
  const auth = inject(AuthStore);

  return next(req).pipe(
    catchError((err: unknown) => {
      if (!(err instanceof HttpErrorResponse)) return throwError(() => err);
      const error = toApiError(err);
      react(error, req, notifier, auth);
      return throwError(() => error);
    }),
  );
};

function react(error: ApiError, req: HttpRequest<unknown>, notifier: Notifier, auth: AuthStore): void {
  const isAuthEndpoint = req.url.startsWith(`${environment.apiUrl}/auth/`);

  if (error.status === 0) return notifier.errorKey('errors.network');
  if (error.status >= 500) return notifier.errorKey('errors.unexpected');
  if (error.status === 401) {
    // No login/cadastro o formulário mostra o detail; fora dele, a sessão acabou.
    if (!isAuthEndpoint) auth.expireSession();
    return;
  }
  if (error.isValidation) return; // o formulário mostra os erros nos campos
  if ((error.status === 409 || error.status === 422) && req.context.get(SKIP_BUSINESS_ERROR_TOAST)) return;
  if (error.status === 400 && isDevMode()) console.error('[api] requisição malformada', req.urlWithParams, error);

  if (error.detail) notifier.error(error.detail);
  else notifier.errorKey('errors.unexpected');
}
```

Create `src/app/core/http/language.interceptor.ts`:
```ts
import type { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { environment } from '@env/environment';
import { TranslocoService } from '@jsverse/transloco';

/** Envia o idioma ativo para a API, que traduz o detail dos erros. */
export const languageInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(environment.apiUrl)) return next(req);
  const lang = inject(TranslocoService).getActiveLang();
  return next(req.clone({ setHeaders: { 'Accept-Language': lang } }));
};
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test -- --watch=false`
Expected: PASS (errorInterceptor 10).

- [ ] **Step 5: Registrar tudo no `app.config.ts`**

Replace `src/app/app.config.ts`:
```ts
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import type { ApplicationConfig } from '@angular/core';
import { provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { providePrimeNG } from 'primeng/config';
import { DialogService } from 'primeng/dynamicdialog';

import { routes } from './app.routes';
import { authInterceptor } from './core/auth/auth.interceptor';
import { provideAuth } from './core/auth/auth.providers';
import { errorInterceptor } from './core/http/error.interceptor';
import { languageInterceptor } from './core/http/language.interceptor';
import { provideI18n } from './core/i18n/i18n.providers';
import { MyFinancePreset } from './core/theme/my-finance.preset';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withFetch(), withInterceptors([authInterceptor, languageInterceptor, errorInterceptor])),
    providePrimeNG({
      theme: {
        preset: MyFinancePreset,
        options: {
          darkModeSelector: '.app-dark',
          cssLayer: { name: 'primeng', order: 'theme, base, primeng' },
        },
      },
      ripple: false,
    }),
    MessageService,
    ConfirmationService,
    DialogService,
    ...provideI18n(),
    provideAuth(),
  ],
};
```

- [ ] **Step 6: Toast e confirmação no `App`**

Replace `src/app/app.ts`:
```ts
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { Toast } from 'primeng/toast';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ConfirmDialog, Toast],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <router-outlet />
    <p-toast position="top-right" />
    <p-confirmdialog />
  `,
})
export class App {}
```

- [ ] **Step 7: Ajustar o budget do bundle inicial**

O PrimeNG (toast, confirm, dialog) leva o bundle inicial para ~760 kB e o budget padrão avisa em 500 kB. Em `angular.json` → `build.configurations.production.budgets`, trocar o item `"type": "initial"` por:
```json
{ "type": "initial", "maximumWarning": "1MB", "maximumError": "1.5MB" }
```

- [ ] **Step 8: Verificar**

Run: `npm run lint && npm test -- --watch=false && npm run build`
Expected: tudo passa, sem aviso de budget.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat(core): adiciona interceptors de erro e idioma e registra toast e confirmação

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: `CrudApi` e `Lookup`

**Files:**
- Create: `src/app/shared/crud/crud-api.ts`, `src/app/shared/crud/crud-api.spec.ts`
- Create: `src/app/shared/crud/lookup.ts`, `src/app/shared/crud/lookup.spec.ts`

**Interfaces:**
- Consumes: `toHttpParams`, `PageRequest`, `PageResponse` (Task 1).
- Produces:
  - `interface ListSource<T, F> { list(filter: Partial<F>, page: PageRequest): Observable<PageResponse<T>> }`
  - `abstract class CrudApi<T extends { id: string }, TCreate, TUpdate = TCreate, TFilter extends object = object>` com `protected http`, `protected abstract path`, `protected get url()`, `list`, `get(id)`, `create(body, context?)`, `update(id, body, context?)`, `delete(id): Observable<null>`, `archive(id): Observable<null>`
  - `class Lookup<T>`: `constructor(loader: () => Observable<PageResponse<T>>)`, `items: Signal<readonly T[]>`, `loaded: Signal<boolean>`, `ensureLoaded()`, `invalidate()`

- [ ] **Step 1: Escrever os testes**

Create `src/app/shared/crud/crud-api.spec.ts`:
```ts
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Injectable } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { skipBusinessErrorToast, SKIP_BUSINESS_ERROR_TOAST } from '../data/http-context';
import { CrudApi } from './crud-api';

interface Thing {
  id: string;
  name: string;
}

@Injectable({ providedIn: 'root' })
class ThingApi extends CrudApi<Thing, { name: string }, { name: string }, { name: string; archived: boolean }> {
  protected readonly path = '/things';
}

describe('CrudApi', () => {
  let api: ThingApi;
  let backend: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    api = TestBed.inject(ThingApi);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  it('list envia filtro e paginação como query params', () => {
    api
      .list({ name: 'nu', archived: false }, { page: 1, size: 20, sort: { field: 'name', direction: 'asc' } })
      .subscribe();
    const req = backend.expectOne((r) => r.url === '/api/v1/things');
    expect(req.request.method).toBe('GET');
    expect(req.request.params.toString()).toBe('name=nu&archived=false&page=1&size=20&sort=name,asc');
  });

  it('create e update repassam o HttpContext', () => {
    api.create({ name: 'a' }, skipBusinessErrorToast()).subscribe();
    const create = backend.expectOne('/api/v1/things');
    expect(create.request.method).toBe('POST');
    expect(create.request.context.get(SKIP_BUSINESS_ERROR_TOAST)).toBe(true);

    api.update('t1', { name: 'b' }).subscribe();
    const update = backend.expectOne('/api/v1/things/t1');
    expect(update.request.method).toBe('PUT');
    expect(update.request.context.get(SKIP_BUSINESS_ERROR_TOAST)).toBe(false);
  });

  it('archive faz PATCH /{id}/archive sem corpo', () => {
    api.archive('t1').subscribe();
    const req = backend.expectOne('/api/v1/things/t1/archive');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toBeNull();
  });

  it('get e delete usam /{id}', () => {
    api.get('t1').subscribe();
    expect(backend.expectOne('/api/v1/things/t1').request.method).toBe('GET');
    api.delete('t1').subscribe();
    expect(backend.expectOne('/api/v1/things/t1').request.method).toBe('DELETE');
  });
});
```

Create `src/app/shared/crud/lookup.spec.ts`:
```ts
import { of, throwError } from 'rxjs';

import type { PageResponse } from '../data/page';
import { Lookup } from './lookup';

const page = (items: string[]): PageResponse<string> => ({
  items,
  page: 0,
  size: 100,
  totalItems: items.length,
  totalPages: 1,
});

describe('Lookup', () => {
  it('carrega uma vez só', () => {
    const loader = vi.fn(() => of(page(['a', 'b'])));
    const lookup = new Lookup(loader);

    lookup.ensureLoaded();
    lookup.ensureLoaded();

    expect(loader).toHaveBeenCalledTimes(1);
    expect(lookup.items()).toEqual(['a', 'b']);
    expect(lookup.loaded()).toBe(true);
  });

  it('invalidate recarrega se já estava carregado', () => {
    const loader = vi
      .fn()
      .mockReturnValueOnce(of(page(['a'])))
      .mockReturnValueOnce(of(page(['a', 'c'])));
    const lookup = new Lookup<string>(loader);
    lookup.ensureLoaded();

    lookup.invalidate();

    expect(loader).toHaveBeenCalledTimes(2);
    expect(lookup.items()).toEqual(['a', 'c']);
  });

  it('invalidate não carrega se ninguém pediu ainda', () => {
    const loader = vi.fn(() => of(page([])));
    new Lookup(loader).invalidate();
    expect(loader).not.toHaveBeenCalled();
  });

  it('erro permite tentar de novo', () => {
    const loader = vi
      .fn()
      .mockReturnValueOnce(throwError(() => new Error('x')))
      .mockReturnValueOnce(of(page(['a'])));
    const lookup = new Lookup<string>(loader);

    lookup.ensureLoaded();
    lookup.ensureLoaded();

    expect(loader).toHaveBeenCalledTimes(2);
    expect(lookup.items()).toEqual(['a']);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test -- --watch=false`
Expected: FAIL (`./crud-api` e `./lookup` não encontrados).

- [ ] **Step 3: Implementar**

Create `src/app/shared/crud/crud-api.ts`:
```ts
import type { HttpContext } from '@angular/common/http';
import { HttpClient } from '@angular/common/http';
import { inject } from '@angular/core';
import { environment } from '@env/environment';
import type { Observable } from 'rxjs';

import { toHttpParams } from '../data/http-params';
import type { PageRequest, PageResponse } from '../data/page';

/** Fonte de uma listagem paginada (o que o injectCrudList precisa). */
export interface ListSource<T, F> {
  list(filter: Partial<F>, page: PageRequest): Observable<PageResponse<T>>;
}

/**
 * Service HTTP genérico de um recurso. Nem todo recurso tem todas as operações: a tela declara quais ações mostra.
 * Criação e edição podem ter corpos diferentes (TCreate × TUpdate).
 */
export abstract class CrudApi<
  T extends { id: string },
  TCreate,
  TUpdate = TCreate,
  TFilter extends object = object,
> implements ListSource<T, TFilter> {
  protected readonly http = inject(HttpClient);
  protected abstract readonly path: string; // ex.: '/accounts'

  protected get url(): string {
    return `${environment.apiUrl}${this.path}`;
  }

  list(filter: Partial<TFilter>, page: PageRequest): Observable<PageResponse<T>> {
    return this.http.get<PageResponse<T>>(this.url, { params: toHttpParams(filter, page) });
  }

  get(id: string): Observable<T> {
    return this.http.get<T>(`${this.url}/${id}`);
  }

  create(body: TCreate, context?: HttpContext): Observable<T> {
    return this.http.post<T>(this.url, body, { context });
  }

  update(id: string, body: TUpdate, context?: HttpContext): Observable<T> {
    return this.http.put<T>(`${this.url}/${id}`, body, { context });
  }

  delete(id: string): Observable<null> {
    return this.http.delete<null>(`${this.url}/${id}`);
  }

  /** PATCH /{id}/archive → 204, sem corpo (o HttpClient entrega null). */
  archive(id: string): Observable<null> {
    return this.http.patch<null>(`${this.url}/${id}/archive`, null);
  }
}
```

Create `src/app/shared/crud/lookup.ts`:
```ts
import { signal } from '@angular/core';
import type { Observable } from 'rxjs';

import type { PageResponse } from '../data/page';

/**
 * Cache de opções de um seletor (endpoints /options). Carrega na primeira vez que alguém pede e recarrega quando a tela
 * do recurso salva ou arquiva (invalidate). As features expõem uma subclasse @Injectable({ providedIn: 'root' }).
 */
export class Lookup<T> {
  private readonly state = signal<readonly T[]>([]);
  private readonly loadedState = signal(false);
  private requested = false;

  readonly items = this.state.asReadonly();
  readonly loaded = this.loadedState.asReadonly();

  constructor(private readonly loader: () => Observable<PageResponse<T>>) {}

  ensureLoaded(): void {
    if (this.requested) return;
    this.requested = true;
    this.loader().subscribe({
      next: (page) => {
        this.state.set(page.items);
        this.loadedState.set(true);
      },
      error: () => (this.requested = false),
    });
  }

  /** Recarrega só se já tinha sido carregado; senão, carrega quando alguém pedir. */
  invalidate(): void {
    if (!this.requested) return;
    this.requested = false;
    this.ensureLoaded();
  }
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test -- --watch=false`
Expected: PASS (CrudApi 4, Lookup 4).

- [ ] **Step 5: Commit**

```bash
git add src/app/shared/crud
git commit -m "feat(shared): adiciona CrudApi genérico e cache de lookups

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Filtros declarativos, estado na URL e `injectCrudList`

**Files:**
- Create: `src/app/shared/crud/filter.ts`, `src/app/shared/crud/filter.spec.ts`
- Create: `src/app/shared/crud/list-state.ts`, `src/app/shared/crud/list-state.spec.ts`
- Create: `src/app/shared/crud/crud-list.ts`, `src/app/shared/crud/crud-list.spec.ts`

**Interfaces:**
- Consumes: `ListSource` (Task 4); `PageRequest`, `SortSpec`, `DEFAULT_PAGE_SIZE`, `samePageRequest`, `fromLocalDate`, `toLocalDate` (Task 1).
- Produces:
  - `interface LookupOption { value: string; label: string; depth?: number; color?: string | null }`
  - `type FilterField` = união de `text` | `enum` (`enumKey`, `options`) | `boolean` | `dateRange` (`fromKey`, `toKey`) | `lookup` (`options: Signal<readonly LookupOption[]>`), todos com `key` (nome do query param) e `label` (chave i18n)
  - `type FilterValue = Record<string, string | boolean | undefined>`
  - `fieldKeys`, `filterToForm`, `formToFilter`, `countActiveFilters`, `sameFilter`
  - `readListState(params: ParamMap, fields)`, `writeListState(filter, page, defaults): Params`
  - `interface PagedList<T> { items; totalItems; loading; page; setPage(p) }`, `interface CrudList<T, F> extends PagedList<T> { filter; setFilter(f); reload() }`
  - `interface CrudListOptions<F> { sort?; size?; initialFilter?; filterFields?; syncWithUrl? }`
  - `injectCrudList<T, F extends object>(api: ListSource<T, F>, options?): CrudList<T, F>`

Regras do `injectCrudList`:
- Filtro inicial = `initialFilter` + o que vier na URL (a URL ganha). A URL guarda só o que difere do padrão (`/accounts?archived=true&name=nu&page=2`).
- Filtro novo volta para a página 0; `setPage` com os mesmos valores não busca de novo (o `p-table` emite `onLazyLoad` repetido).
- Erro na busca mantém os dados anteriores (o `errorInterceptor` já avisou).

- [ ] **Step 1: Escrever os testes**

Create `src/app/shared/crud/filter.spec.ts`:
```ts
import { signal } from '@angular/core';

import type { FilterField } from './filter';
import { countActiveFilters, filterToForm, formToFilter, sameFilter } from './filter';

const fields: FilterField[] = [
  { key: 'description', type: 'text', label: 'f.description' },
  { key: 'type', type: 'enum', label: 'f.type', enumKey: 'transactionType', options: ['INCOME', 'EXPENSE'] },
  { key: 'archived', type: 'boolean', label: 'common.onlyArchived' },
  { key: 'period', type: 'dateRange', label: 'f.period', fromKey: 'from', toKey: 'to' },
  { key: 'accountId', type: 'lookup', label: 'f.account', options: signal([]) },
];

describe('formToFilter', () => {
  it('converte e remove vazios', () => {
    const filter = formToFilter(fields, {
      description: '  mercado ',
      type: null,
      archived: false,
      period: [new Date(2026, 9, 1), new Date(2026, 9, 31, 23, 0)],
      accountId: 'a1',
    });
    expect(filter).toEqual({
      description: 'mercado',
      archived: false,
      from: '2026-10-01',
      to: '2026-10-31',
      accountId: 'a1',
    });
  });

  it('período com só a data inicial', () => {
    expect(formToFilter(fields, { period: [new Date(2026, 9, 1), null] })).toEqual({
      archived: false,
      from: '2026-10-01',
    });
  });

  it('texto só com espaços não entra', () => {
    expect(formToFilter(fields, { description: '   ' })).toEqual({ archived: false });
  });
});

describe('filterToForm', () => {
  it('converte LocalDate em Date e preenche ausentes com null', () => {
    const form = filterToForm(fields, { from: '2026-10-01', to: '2026-10-31', archived: true });
    expect(form['description']).toBeNull();
    expect(form['archived']).toBe(true);
    const [from, to] = form['period'] as Date[];
    expect([from.getDate(), to.getDate(), to.getMonth()]).toEqual([1, 31, 9]);
  });

  it('ida e volta preserva o filtro', () => {
    const filter = {
      description: 'x',
      type: 'INCOME',
      archived: false,
      from: '2026-10-01',
      to: '2026-10-05',
      accountId: 'a1',
    };
    expect(formToFilter(fields, filterToForm(fields, filter))).toEqual(filter);
  });
});

describe('countActiveFilters', () => {
  it('conta campos diferentes do inicial (o período conta uma vez)', () => {
    const initial = { archived: false };
    expect(countActiveFilters(fields, { archived: false }, initial)).toBe(0);
    expect(
      countActiveFilters(fields, { archived: true, from: '2026-10-01', to: '2026-10-02', type: 'INCOME' }, initial),
    ).toBe(3);
  });
});

describe('sameFilter', () => {
  it('ignora ordem das chaves e valores vazios', () => {
    expect(sameFilter({ a: '1', b: undefined, c: '' }, { a: '1' })).toBe(true);
    expect(sameFilter({ a: '1', b: false }, { b: false, a: '1' })).toBe(true);
    expect(sameFilter({ a: '1' }, { a: '2' })).toBe(false);
  });
});
```

Create `src/app/shared/crud/list-state.spec.ts`:
```ts
import { convertToParamMap } from '@angular/router';

import type { FilterField } from './filter';
import { readListState, writeListState } from './list-state';

const fields: FilterField[] = [
  { key: 'name', type: 'text', label: 'x' },
  { key: 'archived', type: 'boolean', label: 'x' },
  { key: 'period', type: 'dateRange', label: 'x', fromKey: 'from', toKey: 'to' },
];

describe('readListState', () => {
  it('lê filtros com os tipos certos, página e ordenação', () => {
    const state = readListState(
      convertToParamMap({
        name: 'nu',
        archived: 'true',
        from: '2026-10-01',
        page: '2',
        size: '50',
        sort: 'name,desc',
        other: 'x',
      }),
      fields,
    );
    expect(state).toEqual({
      filter: { name: 'nu', archived: true, from: '2026-10-01' },
      page: 2,
      size: 50,
      sort: { field: 'name', direction: 'desc' },
    });
  });

  it('ignora página e ordenação inválidas', () => {
    const state = readListState(convertToParamMap({ page: 'abc', size: '-1', sort: 'name,up' }), fields);
    expect(state).toEqual({ filter: {}, page: undefined, size: undefined, sort: undefined });
  });
});

describe('writeListState', () => {
  const defaults = { filter: { archived: false }, size: 20, sort: { field: 'name', direction: 'asc' as const } };

  it('omite o que é igual ao padrão', () => {
    expect(writeListState({ archived: false }, { page: 0, size: 20, sort: defaults.sort }, defaults)).toEqual({});
  });

  it('grava filtro, página, tamanho e ordenação diferentes do padrão', () => {
    const params = writeListState(
      { name: 'nu', archived: true },
      { page: 3, size: 50, sort: { field: 'type', direction: 'desc' } },
      defaults,
    );
    expect(params).toEqual({ name: 'nu', archived: 'true', page: 3, size: 50, sort: 'type,desc' });
  });
});
```

Create `src/app/shared/crud/crud-list.spec.ts`:
```ts
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import type { PageRequest, PageResponse } from '../data/page';
import type { ListSource } from './crud-api';
import type { CrudList, CrudListOptions } from './crud-list';
import { injectCrudList } from './crud-list';
import type { FilterField } from './filter';

@Component({ template: '', changeDetection: ChangeDetectionStrategy.OnPush })
class BlankPage {}

interface Item {
  id: string;
}
interface Filter {
  name: string;
  archived: boolean;
}

const page = (ids: string[], totalItems = ids.length): PageResponse<Item> => ({
  items: ids.map((id) => ({ id })),
  page: 0,
  size: 20,
  totalItems,
  totalPages: 1,
});

const fields: FilterField[] = [
  { key: 'name', type: 'text', label: 'x' },
  { key: 'archived', type: 'boolean', label: 'x' },
];

describe('injectCrudList', () => {
  let api: ListSource<Item, Filter> & { list: ReturnType<typeof vi.fn> };
  let router: Router;

  beforeEach(() => {
    api = { list: vi.fn(() => of(page(['a', 'b'], 42))) };
    TestBed.configureTestingModule({ providers: [provideRouter([{ path: '**', component: BlankPage }])] });
    router = TestBed.inject(Router);
  });

  function create(options: CrudListOptions<Filter> = {}): CrudList<Item, Filter> {
    const list = TestBed.runInInjectionContext(() => injectCrudList(api, options));
    TestBed.tick();
    return list;
  }

  const lastCall = () => api.list.mock.lastCall as [Partial<Filter>, PageRequest];

  it('busca na criação com o filtro inicial, página 0 e ordenação padrão', () => {
    const list = create({ initialFilter: { archived: false }, sort: { field: 'name', direction: 'asc' } });

    expect(api.list).toHaveBeenCalledTimes(1);
    expect(lastCall()).toEqual([{ archived: false }, { page: 0, size: 20, sort: { field: 'name', direction: 'asc' } }]);
    expect(list.items().map((i) => i.id)).toEqual(['a', 'b']);
    expect(list.totalItems()).toBe(42);
    expect(list.loading()).toBe(false);
  });

  it('filtro novo volta para a página 0', () => {
    const list = create();
    list.setPage({ page: 3 });
    TestBed.tick();

    list.setFilter({ name: 'nu' });
    TestBed.tick();

    expect(lastCall()).toEqual([{ name: 'nu' }, { page: 0, size: 20, sort: undefined }]);
  });

  it('setPage com os mesmos valores não busca de novo', () => {
    const list = create();
    list.setPage({ page: 0, size: 20 });
    TestBed.tick();

    expect(api.list).toHaveBeenCalledTimes(1);
  });

  it('reload busca de novo com o mesmo estado', () => {
    const list = create();
    list.reload();

    expect(api.list).toHaveBeenCalledTimes(2);
  });

  it('erro mantém os dados anteriores', () => {
    const list = create();
    api.list.mockReturnValueOnce(throwError(() => new Error('x')));

    list.reload();

    expect(list.items().map((i) => i.id)).toEqual(['a', 'b']);
    expect(list.loading()).toBe(false);
  });

  it('lê filtro, página e ordenação da URL, por cima do filtro inicial', async () => {
    await router.navigateByUrl('/accounts?name=nu&page=2&sort=type,desc');

    create({ initialFilter: { archived: false }, filterFields: fields });

    expect(lastCall()).toEqual([
      { archived: false, name: 'nu' },
      { page: 2, size: 20, sort: { field: 'type', direction: 'desc' } },
    ]);
  });

  it('grava na URL só o que difere do padrão', async () => {
    await router.navigateByUrl('/accounts');
    const list = create({ initialFilter: { archived: false }, filterFields: fields });

    list.setFilter({ archived: true, name: 'nu' });
    TestBed.tick();

    await vi.waitFor(() => expect(router.url).toBe('/accounts?archived=true&name=nu'));
  });

  it('syncWithUrl: false não lê nem grava a URL', async () => {
    await router.navigateByUrl('/accounts?name=nu');
    const list = create({ syncWithUrl: false, filterFields: fields });

    list.setFilter({ name: 'outro' });
    TestBed.tick();
    await Promise.resolve();

    expect(lastCall()[0]).toEqual({ name: 'outro' });
    expect(router.url).toBe('/accounts?name=nu');
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test -- --watch=false`
Expected: FAIL (`./filter`, `./list-state`, `./crud-list` não encontrados).

- [ ] **Step 3: Implementar**

Create `src/app/shared/crud/filter.ts`:
```ts
import type { Signal } from '@angular/core';

import { fromLocalDate, toLocalDate } from '../data/dates';

/** Opção de seletor vinda de um Lookup. depth indenta subcategorias; color mostra a bolinha da categoria. */
export interface LookupOption {
  value: string;
  label: string;
  depth?: number;
  color?: string | null;
}

interface BaseField {
  key: string; // mesmo nome do query param da API
  label: string; // chave i18n
}

export type FilterField =
  | (BaseField & { type: 'text' })
  | (BaseField & { type: 'enum'; enumKey: string; options: readonly string[] })
  | (BaseField & { type: 'boolean' })
  | (BaseField & { type: 'dateRange'; fromKey: string; toKey: string })
  | (BaseField & { type: 'lookup'; options: Signal<readonly LookupOption[]> });

/** Valor de filtro como vai para a API e para a URL: strings (datas já em LocalDate) e booleanos. */
export type FilterValue = Record<string, string | boolean | undefined>;

/** Chaves de query param que um campo produz (o período produz duas). */
export function fieldKeys(field: FilterField): string[] {
  return field.type === 'dateRange' ? [field.fromKey, field.toKey] : [field.key];
}

/** Filtro → valores do formulário (o p-datepicker trabalha com Date). */
export function filterToForm(fields: readonly FilterField[], filter: FilterValue): Record<string, unknown> {
  const form: Record<string, unknown> = {};
  for (const field of fields) {
    if (field.type === 'boolean') {
      form[field.key] = filter[field.key] === true;
    } else if (field.type === 'dateRange') {
      const from = filter[field.fromKey];
      const to = filter[field.toKey];
      form[field.key] =
        typeof from === 'string' ? [fromLocalDate(from), typeof to === 'string' ? fromLocalDate(to) : null] : null;
    } else {
      form[field.key] = filter[field.key] ?? null;
    }
  }
  return form;
}

/** Valores do formulário → filtro, sem vazios. */
export function formToFilter(fields: readonly FilterField[], raw: Record<string, unknown>): FilterValue {
  const filter: FilterValue = {};
  for (const field of fields) {
    const value = raw[field.key];
    if (field.type === 'boolean') {
      filter[field.key] = value === true;
    } else if (field.type === 'dateRange') {
      const [from, to] = Array.isArray(value) ? (value as (Date | null)[]) : [];
      if (from instanceof Date) filter[field.fromKey] = toLocalDate(from);
      if (to instanceof Date) filter[field.toKey] = toLocalDate(to);
    } else if (field.type === 'text') {
      const text = typeof value === 'string' ? value.trim() : '';
      if (text) filter[field.key] = text;
    } else if (typeof value === 'string' && value) {
      filter[field.key] = value;
    }
  }
  return filter;
}

/** Quantos campos estão diferentes do filtro inicial (contador do botão de filtros no celular). */
export function countActiveFilters(fields: readonly FilterField[], value: FilterValue, initial: FilterValue): number {
  return fields.filter((field) =>
    fieldKeys(field).some((key) => value[key] !== undefined && value[key] !== initial[key]),
  ).length;
}

export function sameFilter(a: object, b: object): boolean {
  return normalize(a) === normalize(b);
}

function normalize(filter: object): string {
  const entries = Object.entries(filter).filter(([, v]) => v !== undefined && v !== null && v !== '');
  return JSON.stringify(entries.sort(([a], [b]) => a.localeCompare(b)));
}
```

Create `src/app/shared/crud/list-state.ts`:
```ts
import type { ParamMap, Params } from '@angular/router';

import type { PageRequest, SortSpec } from '../data/page';
import type { FilterField, FilterValue } from './filter';
import { fieldKeys } from './filter';

export interface UrlListState {
  filter: FilterValue; // só o que veio na URL
  page?: number;
  size?: number;
  sort?: SortSpec;
}

/** Lê filtro, página e ordenação da URL, convertendo os tipos pelas definições dos filtros. */
export function readListState(params: ParamMap, fields: readonly FilterField[]): UrlListState {
  const filter: FilterValue = {};
  for (const field of fields) {
    for (const key of fieldKeys(field)) {
      const value = params.get(key);
      if (value === null) continue;
      filter[key] = field.type === 'boolean' ? value === 'true' : value;
    }
  }
  return {
    filter,
    page: toInt(params.get('page')),
    size: toInt(params.get('size')),
    sort: toSort(params.get('sort')),
  };
}

/** Grava na URL só o que difere do padrão, para o link ficar curto. */
export function writeListState(
  filter: FilterValue,
  page: PageRequest,
  defaults: { filter: FilterValue; size: number; sort?: SortSpec },
): Params {
  const params: Params = {};
  for (const [key, value] of Object.entries(filter)) {
    if (value === undefined || value === '' || value === defaults.filter[key]) continue;
    params[key] = String(value);
  }
  if (page.page > 0) params['page'] = page.page;
  if (page.size !== defaults.size) params['size'] = page.size;
  if (page.sort && (page.sort.field !== defaults.sort?.field || page.sort.direction !== defaults.sort?.direction)) {
    params['sort'] = `${page.sort.field},${page.sort.direction}`;
  }
  return params;
}

function toInt(value: string | null): number | undefined {
  const parsed = value === null ? NaN : Number.parseInt(value, 10);
  return Number.isNaN(parsed) || parsed < 0 ? undefined : parsed;
}

function toSort(value: string | null): SortSpec | undefined {
  const [field, direction] = value?.split(',') ?? [];
  return field && (direction === 'asc' || direction === 'desc') ? { field, direction } : undefined;
}
```

Create `src/app/shared/crud/crud-list.ts`:
```ts
import type { Signal } from '@angular/core';
import { computed, effect, inject, signal, untracked } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, catchError, finalize, map, merge, of, switchMap } from 'rxjs';

import type { PageRequest, PageResponse, SortSpec } from '../data/page';
import { DEFAULT_PAGE_SIZE, samePageRequest } from '../data/page';
import type { ListSource } from './crud-api';
import type { FilterField, FilterValue } from './filter';
import { readListState, writeListState } from './list-state';

export interface CrudListOptions<F> {
  sort?: SortSpec; // ordenação inicial
  size?: number; // padrão 20
  initialFilter?: Partial<F>; // ex.: { archived: false }
  filterFields?: readonly FilterField[]; // usado para ler o filtro da URL com os tipos certos
  syncWithUrl?: boolean; // padrão true
}

/** O que a <app-data-table> precisa de uma listagem. */
export interface PagedList<T> {
  readonly items: Signal<T[]>;
  readonly totalItems: Signal<number>;
  readonly loading: Signal<boolean>;
  readonly page: Signal<PageRequest>;
  setPage(page: Partial<PageRequest>): void;
}

export interface CrudList<T, F> extends PagedList<T> {
  readonly filter: Signal<Partial<F>>;
  /** Filtro novo volta para a página 0. */
  setFilter(filter: Partial<F>): void;
  reload(): void;
}

/**
 * Estado de uma listagem paginada: filtro, página, ordenação, carregamento e sincronização com a URL.
 * Chamar em inicializador de campo (contexto de injeção): `readonly list = injectCrudList(this.api, {...})`.
 */
export function injectCrudList<T, F extends object>(
  api: ListSource<T, F>,
  options: CrudListOptions<F> = {},
): CrudList<T, F> {
  const route = inject(ActivatedRoute);
  const router = inject(Router);
  const syncWithUrl = options.syncWithUrl ?? true;
  const initialFilter = options.initialFilter ?? {};
  const defaultSize = options.size ?? DEFAULT_PAGE_SIZE;
  const fromUrl = syncWithUrl ? readListState(route.snapshot.queryParamMap, options.filterFields ?? []) : undefined;

  const filter = signal<Partial<F>>({ ...initialFilter, ...(fromUrl?.filter as Partial<F> | undefined) });
  const page = signal<PageRequest>({
    page: fromUrl?.page ?? 0,
    size: fromUrl?.size ?? defaultSize,
    sort: fromUrl?.sort ?? options.sort,
  });
  const data = signal<PageResponse<T> | null>(null);
  const loading = signal(false);
  const reload$ = new Subject<void>();
  const query = computed(() => ({ filter: filter(), page: page() }));

  // Filtro ou página mudou (ou reload): nova busca. O switchMap cancela a anterior.
  merge(toObservable(query), reload$.pipe(map(() => query())))
    .pipe(
      switchMap((q) => {
        loading.set(true);
        return api.list(q.filter, q.page).pipe(
          catchError(() => of(null)), // o errorInterceptor já avisou; mantém os dados anteriores
          finalize(() => loading.set(false)),
        );
      }),
      takeUntilDestroyed(),
    )
    .subscribe((result) => {
      if (result) data.set(result);
    });

  if (syncWithUrl) {
    effect(() => {
      const queryParams = writeListState(filter() as FilterValue, page(), {
        filter: initialFilter as FilterValue,
        size: defaultSize,
        sort: options.sort,
      });
      untracked(() => void router.navigate([], { relativeTo: route, queryParams, replaceUrl: true }));
    });
  }

  return {
    filter: filter.asReadonly(),
    page: page.asReadonly(),
    loading: loading.asReadonly(),
    items: computed(() => data()?.items ?? []),
    totalItems: computed(() => data()?.totalItems ?? 0),
    setFilter(next) {
      filter.set(next);
      page.update((current) => ({ ...current, page: 0 }));
    },
    setPage(next) {
      const merged = { ...page(), ...next };
      if (!samePageRequest(merged, page())) page.set(merged);
    },
    reload() {
      reload$.next();
    },
  };
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test -- --watch=false`
Expected: PASS (filter 7, list-state 4, injectCrudList 8).

- [ ] **Step 5: Commit**

```bash
git add src/app/shared/crud
git commit -m "feat(shared): adiciona filtros declarativos e injectCrudList com estado na URL

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Formulários (`injectFormSubmit`, erros de servidor, `<app-field>`, `<app-form-footer>`)

**Files:**
- Create: `src/app/shared/forms/validation-message.ts`, `src/app/shared/forms/validation-message.spec.ts`
- Create: `src/app/shared/forms/server-errors.ts`, `src/app/shared/forms/server-errors.spec.ts`
- Create: `src/app/shared/forms/form-submit.ts`, `src/app/shared/forms/form-submit.spec.ts`
- Create: `src/app/shared/forms/field.component.ts`, `src/app/shared/forms/form-footer.component.ts`

**Interfaces:**
- Consumes: `ApiError`, `skipBusinessErrorToast` (Task 1).
- Produces:
  - `validationMessage(errors, translate): string`
  - `applyServerErrors(form, error, fieldMap?): string[]` (mensagens sem controle)
  - `interface FormSubmit { submitting: Signal<boolean>; error: Signal<string | null>; submit(): void }`
  - `injectFormSubmit<TForm extends FormGroup, R>(form, operation: (value, context: HttpContext) => Observable<R>, onSuccess: (result: R) => void): FormSubmit`
  - `<app-field label="chave.i18n" fieldId="id-do-input" [control]="form.controls.x">` com o controle projetado
  - `<app-form-footer [submit]="submit" (cancelled)="...">`

Uso nas features (plano 0b3):
```html
<form [formGroup]="form" (ngSubmit)="submit.submit()" class="flex flex-col gap-4">
  <app-field label="accounts.fields.name" fieldId="account-name" [control]="form.controls.name">
    <input pInputText id="account-name" formControlName="name" />
  </app-field>
  <app-form-footer [submit]="submit" (cancelled)="ref.close(false)" />
</form>
```

- [ ] **Step 1: Escrever os testes**

Create `src/app/shared/forms/validation-message.spec.ts`:
```ts
import { validationMessage } from './validation-message';

const translate = (key: string, params?: Record<string, unknown>) => `${key}${params ? JSON.stringify(params) : ''}`;

describe('validationMessage', () => {
  it('erro do servidor aparece como veio', () => {
    expect(validationMessage({ server: 'deve ser maior que 0' }, translate)).toBe('deve ser maior que 0');
  });

  it('erro do Angular vira chave validation.<erro> com os parâmetros', () => {
    expect(validationMessage({ maxlength: { requiredLength: 100, actualLength: 120 } }, translate)).toBe(
      'validation.maxlength{"requiredLength":100,"actualLength":120}',
    );
    expect(validationMessage({ required: true }, translate)).toBe('validation.required{}');
  });

  it('erro desconhecido usa validation.invalid', () => {
    expect(validationMessage({ meuErro: true }, translate)).toBe('validation.invalid{}');
  });
});
```

Create `src/app/shared/forms/server-errors.spec.ts`:
```ts
import { FormControl, FormGroup } from '@angular/forms';

import { ApiError } from '../data/api-error';
import { applyServerErrors } from './server-errors';

describe('applyServerErrors', () => {
  const validation = (errors: { field: string; message: string }[]) =>
    new ApiError(400, 'common.VALIDATION_ERROR', 'Dados inválidos.', errors);

  it('marca o controle com errors.server', () => {
    const form = new FormGroup({ amount: new FormControl(0) });

    const unmatched = applyServerErrors(form, validation([{ field: 'amount', message: 'deve ser maior que 0' }]));

    expect(form.controls.amount.errors).toEqual({ server: 'deve ser maior que 0' });
    expect(form.controls.amount.touched).toBe(true);
    expect(unmatched).toEqual([]);
  });

  it('usa o mapeamento quando o nome difere', () => {
    const form = new FormGroup({ date: new FormControl(null) });

    applyServerErrors(form, validation([{ field: 'transactionDate', message: 'obrigatório' }]), {
      transactionDate: 'date',
    });

    expect(form.controls.date.errors).toEqual({ server: 'obrigatório' });
  });

  it('devolve as mensagens sem controle', () => {
    const form = new FormGroup({ name: new FormControl('') });
    expect(applyServerErrors(form, validation([{ field: 'outro', message: 'm1' }]))).toEqual(['m1']);
  });
});
```

Create `src/app/shared/forms/form-submit.spec.ts`:
```ts
import type { HttpContext } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import type { Observable } from 'rxjs';
import { Subject, of, throwError } from 'rxjs';

import { ApiError } from '../data/api-error';
import { SKIP_BUSINESS_ERROR_TOAST } from '../data/http-context';
import { injectFormSubmit } from './form-submit';

describe('injectFormSubmit', () => {
  const buildForm = (name = 'Nubank') =>
    new FormGroup({ name: new FormControl(name, { nonNullable: true, validators: Validators.required }) });

  it('não envia formulário inválido e marca os campos', () => {
    const form = buildForm('');
    const operation = vi.fn(() => of(null));
    const submit = TestBed.runInInjectionContext(() => injectFormSubmit(form, operation, vi.fn()));

    submit.submit();

    expect(operation).not.toHaveBeenCalled();
    expect(form.controls.name.touched).toBe(true);
  });

  it('envia o valor com o contexto sem toast de negócio e chama onSuccess', () => {
    const form = buildForm();
    const operation = vi.fn<(value: { name: string }, context: HttpContext) => Observable<{ id: string }>>(() =>
      of({ id: '1' }),
    );
    const onSuccess = vi.fn();
    const submit = TestBed.runInInjectionContext(() => injectFormSubmit(form, operation, onSuccess));

    submit.submit();

    const [value, context] = operation.mock.lastCall ?? [];
    expect(value).toEqual({ name: 'Nubank' });
    expect(context?.get(SKIP_BUSINESS_ERROR_TOAST)).toBe(true);
    expect(onSuccess).toHaveBeenCalledWith({ id: '1' });
    expect(submit.submitting()).toBe(false);
  });

  it('bloqueia envio duplo enquanto a requisição não volta', () => {
    const pending = new Subject<null>();
    const operation = vi.fn(() => pending);
    const submit = TestBed.runInInjectionContext(() => injectFormSubmit(buildForm(), operation, vi.fn()));

    submit.submit();
    submit.submit();

    expect(operation).toHaveBeenCalledTimes(1);
    expect(submit.submitting()).toBe(true);
    pending.next(null);
    pending.complete();
    expect(submit.submitting()).toBe(false);
  });

  it('400 VALIDATION_ERROR vai para os campos', () => {
    const form = buildForm();
    const error = new ApiError(400, 'common.VALIDATION_ERROR', 'Dados inválidos.', [
      { field: 'name', message: 'muito longo' },
    ]);
    const submit = TestBed.runInInjectionContext(() => injectFormSubmit(form, () => throwError(() => error), vi.fn()));

    submit.submit();

    expect(form.controls.name.errors).toEqual({ server: 'muito longo' });
    expect(submit.error()).toBeNull();
  });

  it('422 vira erro geral do formulário', () => {
    const error = new ApiError(
      422,
      'transaction.TRANSFER_SAME_ACCOUNT',
      'Conta de origem e destino não podem ser iguais.',
    );
    const submit = TestBed.runInInjectionContext(() =>
      injectFormSubmit(buildForm(), () => throwError(() => error), vi.fn()),
    );

    submit.submit();

    expect(submit.error()).toBe('Conta de origem e destino não podem ser iguais.');
  });

  it('500 não vira erro do formulário (o interceptor já mostrou toast)', () => {
    const submit = TestBed.runInInjectionContext(() =>
      injectFormSubmit(buildForm(), () => throwError(() => new ApiError(500, 'common.INTERNAL_ERROR', 'x')), vi.fn()),
    );

    submit.submit();

    expect(submit.error()).toBeNull();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test -- --watch=false`
Expected: FAIL (módulos não encontrados).

- [ ] **Step 3: Implementar as funções**

Create `src/app/shared/forms/validation-message.ts`:
```ts
import type { ValidationErrors } from '@angular/forms';

const KNOWN_ERRORS = ['required', 'maxlength', 'minlength', 'min', 'email', 'pattern'];

/** Mensagem do primeiro erro: o erro do servidor aparece como veio; os do Angular viram `validation.<erro>`. */
export function validationMessage(
  errors: ValidationErrors,
  translate: (key: string, params?: Record<string, unknown>) => string,
): string {
  if (typeof errors['server'] === 'string') return errors['server'];
  const [key] = Object.keys(errors);
  if (!key) return '';
  const params =
    typeof errors[key] === 'object' && errors[key] !== null ? (errors[key] as Record<string, unknown>) : {};
  return translate(`validation.${KNOWN_ERRORS.includes(key) ? key : 'invalid'}`, params);
}
```

Create `src/app/shared/forms/server-errors.ts`:
```ts
import type { AbstractControl } from '@angular/forms';

import type { ApiError } from '../data/api-error';

/**
 * Aplica os erros de campo de um 400 VALIDATION_ERROR nos controles (errors.server, exibido pelo <app-field>).
 * Os nomes de campo do backend são os do formulário; quando divergirem, informe o mapeamento.
 * Devolve as mensagens que não acharam controle, para o formulário mostrar como erro geral.
 */
export function applyServerErrors(
  form: AbstractControl,
  error: ApiError,
  fieldMap: Readonly<Record<string, string>> = {},
): string[] {
  const unmatched: string[] = [];
  for (const { field, message } of error.fieldErrors) {
    const control = form.get(fieldMap[field] ?? field);
    if (control) {
      control.setErrors({ ...control.errors, server: message });
      control.markAsTouched();
    } else {
      unmatched.push(message);
    }
  }
  return unmatched;
}
```

Create `src/app/shared/forms/form-submit.ts`:
```ts
import type { HttpContext } from '@angular/common/http';
import type { Signal } from '@angular/core';
import { DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type { FormGroup } from '@angular/forms';
import type { Observable } from 'rxjs';
import { finalize } from 'rxjs';

import { ApiError } from '../data/api-error';
import { skipBusinessErrorToast } from '../data/http-context';
import { applyServerErrors } from './server-errors';

export interface FormSubmit {
  readonly submitting: Signal<boolean>;
  /** Erro geral do formulário (401/409/422 ou erro de campo sem controle), exibido pelo <app-form-footer>. */
  readonly error: Signal<string | null>;
  submit(): void;
}

/**
 * Envio padrão: marca os campos como tocados, não envia inválido, bloqueia envio duplo, aplica os erros de validação do
 * servidor nos campos e guarda o detail de 401/409/422 para exibir dentro do formulário (sem toast).
 * A operação recebe o HttpContext que desliga o toast de 409/422: repasse-o para o CrudApi.
 */
export function injectFormSubmit<TForm extends FormGroup, R>(
  form: TForm,
  operation: (value: ReturnType<TForm['getRawValue']>, context: HttpContext) => Observable<R>,
  onSuccess: (result: R) => void,
): FormSubmit {
  const destroyRef = inject(DestroyRef);
  const submitting = signal(false);
  const error = signal<string | null>(null);

  return {
    submitting: submitting.asReadonly(),
    error: error.asReadonly(),
    submit() {
      if (submitting()) return;
      form.markAllAsTouched();
      if (form.invalid) return;

      submitting.set(true);
      error.set(null);
      operation(form.getRawValue(), skipBusinessErrorToast())
        .pipe(
          finalize(() => submitting.set(false)),
          takeUntilDestroyed(destroyRef),
        )
        .subscribe({
          next: (result) => onSuccess(result),
          error: (err: unknown) => {
            if (!(err instanceof ApiError)) return;
            if (err.isValidation) {
              const unmatched = applyServerErrors(form, err);
              error.set(unmatched.length ? unmatched.join(' ') : null);
            } else if (err.status === 401 || err.status === 409 || err.status === 422) {
              error.set(err.detail);
            }
          },
        });
    },
  };
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test -- --watch=false`
Expected: PASS (validationMessage 3, applyServerErrors 3, injectFormSubmit 6).

- [ ] **Step 5: Componentes**

Create `src/app/shared/forms/field.component.ts`:
```ts
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import type { AbstractControl } from '@angular/forms';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { Message } from 'primeng/message';
import { startWith, switchMap } from 'rxjs';

import { validationMessage } from './validation-message';

/** Rótulo + controle projetado + mensagem de erro (do Angular, traduzida, ou do servidor). */
@Component({
  selector: 'app-field',
  imports: [TranslocoPipe, Message],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col gap-1">
      <label [for]="fieldId()" class="text-sm font-medium">{{ label() | transloco }}</label>
      <ng-content />
      @if (message(); as text) {
        <p-message severity="error" size="small" variant="simple">{{ text }}</p-message>
      }
    </div>
  `,
})
export class FieldComponent {
  readonly label = input.required<string>(); // chave i18n
  readonly fieldId = input.required<string>(); // id do input (inputId nos componentes do PrimeNG)
  readonly control = input.required<AbstractControl>();

  private readonly transloco = inject(TranslocoService);
  // Os erros de um AbstractControl não são signals: os eventos do controle disparam o recálculo.
  private readonly controlEvents = toSignal(
    toObservable(this.control).pipe(switchMap((control) => control.events.pipe(startWith(null)))),
  );

  readonly message = computed(() => {
    this.controlEvents();
    const control = this.control();
    if (!control.touched || !control.errors) return null;
    return validationMessage(control.errors, (key, params) => this.transloco.translate(key, params));
  });
}
```

Create `src/app/shared/forms/form-footer.component.ts`:
```ts
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Button } from 'primeng/button';
import { Message } from 'primeng/message';

import type { FormSubmit } from './form-submit';

/**
 * Rodapé padrão dos formulários em diálogo: erro geral (409/422) + Cancelar/Salvar.
 * Fica DENTRO do <form [formGroup]> do componente (o botão Salvar é type="submit").
 */
@Component({
  selector: 'app-form-footer',
  imports: [TranslocoPipe, Button, Message],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (submit().error(); as message) {
      <p-message severity="error">{{ message }}</p-message>
    }
    <div class="flex justify-end gap-2 pt-2">
      <p-button
        type="button"
        severity="secondary"
        [text]="true"
        [label]="'common.cancel' | transloco"
        (onClick)="cancelled.emit()"
      />
      <p-button type="submit" [label]="'common.save' | transloco" [loading]="submit().submitting()" />
    </div>
  `,
})
export class FormFooterComponent {
  readonly submit = input.required<FormSubmit>();
  readonly cancelled = output();
}
```

- [ ] **Step 6: Verificar e commitar**

Run: `npm run lint && npm run build`

```bash
git add src/app/shared/forms
git commit -m "feat(shared): adiciona injectFormSubmit, erros de servidor nos campos e componentes de formulário

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Tabela declarativa e componentes de UI

**Files:**
- Create: `src/app/shared/crud/column.ts`, `src/app/shared/crud/column.spec.ts`
- Create: `src/app/shared/crud/cell.directive.ts`
- Create: `src/app/shared/crud/data-table.component.ts`, `src/app/shared/crud/data-table.component.html`
- Create: `src/app/shared/ui/money.component.ts`, `src/app/shared/ui/stat-card.component.ts`, `src/app/shared/ui/empty-state.component.ts`

**Interfaces:**
- Consumes: `PagedList` (Task 5); `PageRequest`, `SortSpec` (Task 1).
- Produces:
  - `type ColumnType = 'text' | 'money' | 'date' | 'month' | 'enum' | 'boolean' | 'color'`
  - `interface ColumnDef<T> { field; key?; header; type?; enumKey?; sortField?: string | false; width?; align?; hideOnMobile? }`
  - `interface RowActionDef<T> { id; label; icon; visible?(row) }`, `interface RowActionEvent<T> { id; row }`, constantes `EDIT_ACTION`, `ARCHIVE_ACTION`, `DELETE_ACTION`
  - `columnKey`, `isSortable`, `toPageRequest(event, columns, current)`, `toTableSort(sort, columns)`
  - `CellDirective` (`<ng-template appCell="chave" let-row>`)
  - `<app-data-table [columns] [list] [actions] [emptyMessage] (action)>`
  - `<app-money [amount] [kind]>` (`MoneyKind = 'INCOME' | 'EXPENSE' | 'TRANSFER'`), `<app-stat-card [label] [value] [icon] [kind]>`, `<app-empty-state [message] [icon]>` (com conteúdo projetado opcional)

Comportamento da tabela:
- `p-table` lazy com `lazyLoadOnInit=false` (a lista já busca sozinha); o `onLazyLoad` vira `PageRequest` via `toPageRequest`, que troca o nome da coluna pelo atributo da entidade (`date` → `transactionDate`).
- Formatação por tipo: `money` (`| currency`, alinhado à direita), `date` (`dd/MM/yyyy`), `month` (`MM/yyyy`), `enum` (`enums.<enumKey>.<VALOR>`), `boolean`, `color` (bolinha). Célula customizada com `appCell`.
- Linha arquivada (`archived === true`) esmaecida e com tag "Arquivado" na primeira coluna.
- Ações: uma só → botão direto; várias → menu popup.

- [ ] **Step 1: Escrever o teste da conversão de paginação/ordenação**

Create `src/app/shared/crud/column.spec.ts`:
```ts
import type { ColumnDef } from './column';
import { toPageRequest, toTableSort } from './column';

interface Row {
  id: string;
  date: string;
  description: string;
  amount: number;
}

const columns: ColumnDef<Row>[] = [
  { field: 'date', header: 'x', type: 'date', sortField: 'transactionDate' },
  { field: 'description', header: 'x' },
  { field: 'amount', header: 'x', type: 'money' },
  { field: 'id', key: 'balance', header: 'x', sortField: false },
];

describe('toPageRequest', () => {
  const current = { page: 0, size: 20, sort: { field: 'transactionDate', direction: 'desc' as const } };

  it('calcula a página a partir de first/rows', () => {
    expect(toPageRequest({ first: 40, rows: 20, sortField: 'date', sortOrder: -1 }, columns, current)).toEqual({
      page: 2,
      size: 20,
      sort: { field: 'transactionDate', direction: 'desc' },
    });
  });

  it('usa o sortField da coluna (atributo da entidade) e não o nome do DTO', () => {
    expect(toPageRequest({ first: 0, rows: 20, sortField: 'date', sortOrder: 1 }, columns, current).sort).toEqual({
      field: 'transactionDate',
      direction: 'asc',
    });
  });

  it('coluna sem sortField ordena pelo próprio field', () => {
    expect(toPageRequest({ first: 0, rows: 50, sortField: 'description', sortOrder: 1 }, columns, current)).toEqual({
      page: 0,
      size: 50,
      sort: { field: 'description', direction: 'asc' },
    });
  });

  it('coluna com sortField false ou evento sem ordenação mantém a ordenação atual', () => {
    expect(toPageRequest({ first: 0, rows: 20, sortField: 'balance', sortOrder: 1 }, columns, current).sort).toEqual(
      current.sort,
    );
    expect(toPageRequest({ first: 0, rows: 20 }, columns, current).sort).toEqual(current.sort);
  });
});

describe('toTableSort', () => {
  it('traduz o atributo da entidade de volta para a coluna', () => {
    expect(toTableSort({ field: 'transactionDate', direction: 'desc' }, columns)).toEqual({ field: 'date', order: -1 });
  });

  it('sem ordenação', () => {
    expect(toTableSort(undefined, columns)).toEqual({ field: undefined, order: 1 });
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test -- --watch=false`
Expected: FAIL (`./column` não encontrado).

- [ ] **Step 3: Implementar `column.ts`**

Create `src/app/shared/crud/column.ts`:
```ts
import type { TableLazyLoadEvent } from 'primeng/table';

import type { PageRequest, SortSpec } from '../data/page';

export type ColumnType = 'text' | 'money' | 'date' | 'month' | 'enum' | 'boolean' | 'color';

export interface ColumnDef<T> {
  field: keyof T & string;
  /** Identificador da coluna e do template de célula (appCell). Padrão: field. Use para colunas calculadas. */
  key?: string;
  header: string; // chave i18n
  type?: ColumnType;
  enumKey?: string; // ex.: 'accountType' → enums.accountType.CHECKING
  /** Atributo da ENTIDADE para ?sort= (o nome no DTO pode diferir). Padrão: field. false = não ordena. */
  sortField?: string | false;
  width?: string;
  align?: 'left' | 'right' | 'center'; // money é 'right' por padrão
  /** Esconde a coluna em telas pequenas (< 768 px). */
  hideOnMobile?: boolean;
}

export interface RowActionDef<T> {
  id: string;
  label: string; // chave i18n
  icon: string;
  visible?: (row: T) => boolean;
}

export interface RowActionEvent<T> {
  id: string;
  row: T;
}

export const EDIT_ACTION = { id: 'edit', label: 'common.edit', icon: 'pi pi-pencil' } as const;
export const ARCHIVE_ACTION = { id: 'archive', label: 'common.archive', icon: 'pi pi-inbox' } as const;
export const DELETE_ACTION = { id: 'delete', label: 'common.delete', icon: 'pi pi-trash' } as const;

export function columnKey<T>(column: ColumnDef<T>): string {
  return column.key ?? column.field;
}

export function isSortable<T>(column: ColumnDef<T>): boolean {
  return column.sortField !== false;
}

/** Converte o onLazyLoad do p-table em PageRequest, traduzindo a coluna para o atributo da entidade. */
export function toPageRequest<T>(
  event: TableLazyLoadEvent,
  columns: readonly ColumnDef<T>[],
  current: PageRequest,
): PageRequest {
  const size = event.rows ?? current.size;
  const page = Math.floor((event.first ?? 0) / size);
  const column = columns.find((c) => columnKey(c) === event.sortField);
  const sort: SortSpec | undefined =
    column && isSortable(column)
      ? {
          field: (column.sortField as string | undefined) ?? column.field,
          direction: event.sortOrder === -1 ? 'desc' : 'asc',
        }
      : current.sort;
  return { page, size, sort };
}

/** Ordenação atual → sortField/sortOrder do p-table (o inverso de toPageRequest). */
export function toTableSort<T>(
  sort: SortSpec | undefined,
  columns: readonly ColumnDef<T>[],
): { field: string | undefined; order: number } {
  const column =
    sort && columns.find((c) => isSortable(c) && ((c.sortField as string | undefined) ?? c.field) === sort.field);
  return { field: column ? columnKey(column) : undefined, order: sort?.direction === 'desc' ? -1 : 1 };
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test -- --watch=false`
Expected: PASS (toPageRequest 4, toTableSort 2).

- [ ] **Step 5: Componentes de UI**

Create `src/app/shared/ui/money.component.ts`:
```ts
import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type MoneyKind = 'INCOME' | 'EXPENSE' | 'TRANSFER';

/** Valor em BRL. Com kind, mostra sinal e cor (receita +verde, despesa −vermelho, transferência azul). */
@Component({
  selector: 'app-money',
  imports: [CurrencyPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="whitespace-nowrap tabular-nums" [style.color]="color()"
    >{{ sign() }}{{ amount() | currency }}</span
  >`,
})
export class MoneyComponent {
  readonly amount = input.required<number>();
  readonly kind = input<MoneyKind | null>(null);

  protected readonly sign = computed(() => (this.kind() === 'INCOME' ? '+' : this.kind() === 'EXPENSE' ? '−' : ''));
  protected readonly color = computed(() => {
    const kind = this.kind();
    return kind ? `var(--app-${kind.toLowerCase()})` : null;
  });
}
```

Create `src/app/shared/ui/stat-card.component.ts`:
```ts
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';

import type { MoneyKind } from './money.component';
import { MoneyComponent } from './money.component';

/** Card de indicador do dashboard: rótulo + valor em BRL. */
@Component({
  selector: 'app-stat-card',
  imports: [TranslocoPipe, MoneyComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col gap-2 rounded-border border border-surface bg-surface-0 p-4 dark:bg-surface-900">
      <span class="flex items-center gap-2 text-sm text-muted-color">
        <i [class]="icon()"></i>
        {{ label() | transloco }}
      </span>
      <span class="text-2xl font-semibold">
        <app-money [amount]="value()" [kind]="kind()" />
      </span>
    </div>
  `,
})
export class StatCardComponent {
  readonly label = input.required<string>(); // chave i18n
  readonly value = input.required<number>();
  readonly icon = input('pi pi-wallet');
  readonly kind = input<MoneyKind | null>(null);
}
```

Create `src/app/shared/ui/empty-state.component.ts`:
```ts
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';

/** Mensagem de lista vazia. Ações (link, botão) podem ser projetadas como conteúdo. */
@Component({
  selector: 'app-empty-state',
  imports: [TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col items-center gap-3 py-10 text-center text-muted-color">
      <i [class]="icon()" class="text-4xl"></i>
      <p class="m-0">{{ message() | transloco }}</p>
      <ng-content />
    </div>
  `,
})
export class EmptyStateComponent {
  readonly message = input('common.noResults'); // chave i18n
  readonly icon = input('pi pi-inbox');
}
```

- [ ] **Step 6: Tabela**

Create `src/app/shared/crud/cell.directive.ts`:
```ts
import { Directive, TemplateRef, inject, input } from '@angular/core';

/** Célula customizada da <app-data-table>: `<ng-template appCell="name" let-row>...</ng-template>`. */
@Directive({ selector: '[appCell]' })
export class CellDirective {
  readonly key = input.required<string>({ alias: 'appCell' });
  readonly template = inject(TemplateRef);
}
```

Create `src/app/shared/crud/data-table.component.ts`:
```ts
import { CurrencyPipe, DatePipe, NgTemplateOutlet } from '@angular/common';
import type { TemplateRef } from '@angular/core';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChildren,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import type { MenuItem } from 'primeng/api';
import { Button } from 'primeng/button';
import { Menu } from 'primeng/menu';
import type { TableLazyLoadEvent } from 'primeng/table';
import { TableModule } from 'primeng/table';
import { Tag } from 'primeng/tag';

import { EmptyStateComponent } from '../ui/empty-state.component';
import { CellDirective } from './cell.directive';
import type { ColumnDef, RowActionDef, RowActionEvent } from './column';
import { columnKey, isSortable, toPageRequest, toTableSort } from './column';
import type { PagedList } from './crud-list';

/** Tabela lazy (paginação e ordenação no servidor) sobre p-table, com colunas declaradas e formatação por tipo. */
@Component({
  selector: 'app-data-table',
  imports: [
    CurrencyPipe,
    DatePipe,
    NgTemplateOutlet,
    TranslocoPipe,
    Button,
    Menu,
    TableModule,
    Tag,
    EmptyStateComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './data-table.component.html',
})
export class DataTableComponent<T extends { id: string }> {
  readonly columns = input.required<readonly ColumnDef<T>[]>();
  readonly list = input.required<PagedList<T>>();
  readonly actions = input<readonly RowActionDef<T>[]>([]);
  readonly emptyMessage = input('common.noResults');
  readonly action = output<RowActionEvent<T>>();

  private readonly transloco = inject(TranslocoService);
  private readonly cells = contentChildren(CellDirective);
  private readonly menu = viewChild.required<Menu>('rowMenu');

  protected readonly menuItems = signal<MenuItem[]>([]);
  protected readonly columnKey = columnKey;
  protected readonly isSortable = isSortable;
  protected readonly tableSort = computed(() => toTableSort(this.list().page().sort, this.columns()));
  protected readonly first = computed(() => this.list().page().page * this.list().page().size);
  protected readonly colspan = computed(() => this.columns().length + (this.actions().length ? 1 : 0));

  protected onLazyLoad(event: TableLazyLoadEvent): void {
    this.list().setPage(toPageRequest(event, this.columns(), this.list().page()));
  }

  protected cellTemplate(column: ColumnDef<T>): TemplateRef<unknown> | null {
    return this.cells().find((cell) => cell.key() === columnKey(column))?.template ?? null;
  }

  protected value(row: T, column: ColumnDef<T>): unknown {
    return row[column.field];
  }

  protected alignClass(column: ColumnDef<T>): string {
    const align = column.align ?? (column.type === 'money' ? 'right' : 'left');
    return [`text-${align}`, column.hideOnMobile ? 'hidden md:table-cell' : ''].join(' ');
  }

  protected isArchived(row: T): boolean {
    return (row as { archived?: unknown }).archived === true;
  }

  protected visibleActions(row: T): readonly RowActionDef<T>[] {
    return this.actions().filter((a) => !a.visible || a.visible(row));
  }

  protected emit(id: string, row: T): void {
    this.action.emit({ id, row });
  }

  protected openMenu(event: Event, row: T): void {
    this.menuItems.set(
      this.visibleActions(row).map((a) => ({
        label: this.transloco.translate(a.label),
        icon: a.icon,
        command: () => this.emit(a.id, row),
      })),
    );
    this.menu().toggle(event);
  }
}
```

Create `src/app/shared/crud/data-table.component.html`:
```html
<p-table
  [value]="list().items()"
  [lazy]="true"
  [lazyLoadOnInit]="false"
  [paginator]="true"
  [rows]="list().page().size"
  [first]="first()"
  [totalRecords]="list().totalItems()"
  [loading]="list().loading()"
  [rowsPerPageOptions]="[10, 20, 50, 100]"
  [sortField]="tableSort().field"
  [sortOrder]="tableSort().order"
  [scrollable]="true"
  dataKey="id"
  (onLazyLoad)="onLazyLoad($event)"
>
  <ng-template #header>
    <tr>
      @for (column of columns(); track columnKey(column)) {
        @if (isSortable(column)) {
          <th [pSortableColumn]="columnKey(column)" [class]="alignClass(column)" [style.width]="column.width">
            {{ column.header | transloco }}
            <p-sortIcon [field]="columnKey(column)" />
          </th>
        } @else {
          <th [class]="alignClass(column)" [style.width]="column.width">{{ column.header | transloco }}</th>
        }
      }
      @if (actions().length) {
        <th class="w-16">
          <span class="sr-only">{{ 'common.actions' | transloco }}</span>
        </th>
      }
    </tr>
  </ng-template>

  <ng-template #body let-row>
    <tr [class.opacity-60]="isArchived(row)">
      @for (column of columns(); track columnKey(column); let isFirst = $first) {
        <td [class]="alignClass(column)">
          @if (cellTemplate(column); as template) {
            <ng-container *ngTemplateOutlet="template; context: { $implicit: row }" />
          } @else {
            @switch (column.type) {
              @case ('money') {
                <span class="whitespace-nowrap tabular-nums">{{ $any(value(row, column)) | currency }}</span>
              }
              @case ('date') {
                {{ $any(value(row, column)) | date: 'dd/MM/yyyy' }}
              }
              @case ('month') {
                {{ $any(value(row, column)) | date: 'MM/yyyy' }}
              }
              @case ('enum') {
                {{ 'enums.' + column.enumKey + '.' + value(row, column) | transloco }}
              }
              @case ('boolean') {
                {{ (value(row, column) ? 'common.yes' : 'common.no') | transloco }}
              }
              @case ('color') {
                <span
                  class="inline-block size-4 rounded-full border border-surface"
                  [style.background]="value(row, column)"
                ></span>
              }
              @default {
                {{ value(row, column) }}
              }
            }
          }
          @if (isFirst && isArchived(row)) {
            <p-tag class="ml-2" severity="secondary" [value]="'common.archived' | transloco" />
          }
        </td>
      }
      @if (actions().length) {
        <td class="text-right">
          @let rowActions = visibleActions(row);
          @if (rowActions.length === 1) {
            <p-button
              [icon]="rowActions[0].icon"
              severity="secondary"
              [text]="true"
              [rounded]="true"
              [ariaLabel]="rowActions[0].label | transloco"
              (onClick)="emit(rowActions[0].id, row)"
            />
          } @else if (rowActions.length > 1) {
            <p-button
              icon="pi pi-ellipsis-v"
              severity="secondary"
              [text]="true"
              [rounded]="true"
              [ariaLabel]="'common.actions' | transloco"
              (onClick)="openMenu($event, row)"
            />
          }
        </td>
      }
    </tr>
  </ng-template>

  <ng-template #emptymessage>
    <tr>
      <td [attr.colspan]="colspan()">
        <app-empty-state [message]="emptyMessage()" />
      </td>
    </tr>
  </ng-template>
</p-table>

<p-menu #rowMenu [model]="menuItems()" [popup]="true" appendTo="body" />
```

- [ ] **Step 7: Verificar e commitar**

Run: `npm run lint && npm test -- --watch=false && npm run build`
Expected: tudo passa (o build faz a checagem estrita dos templates).

```bash
git add src/app/shared
git commit -m "feat(shared): adiciona tabela declarativa lazy e componentes de valor, card e estado vazio

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Barra de filtros, moldura de página e `CrudActions`

**Files:**
- Create: `src/app/shared/crud/filter-bar.component.ts`, `src/app/shared/crud/filter-bar.component.html`
- Create: `src/app/shared/crud/crud-page.component.ts`
- Create: `src/app/shared/crud/crud-actions.ts`

**Interfaces:**
- Consumes: `FilterField`, `FilterValue`, `LookupOption`, `filterToForm`, `formToFilter`, `countActiveFilters`, `sameFilter` (Task 5); `Notifier` (Task 2); `DialogService`/`ConfirmationService` (registrados na Task 3).
- Produces:
  - `<app-filter-bar [fields] [value] [initial] (changed)>`: genérico em `F`; emite `Partial<F>` (texto com debounce de 300 ms; demais na hora); botão "Limpar filtros" emite `initial`; abaixo de 1024 px os campos ficam num `p-drawer` com contador
  - `<app-crud-page title="chave" [showCreate] (create)>` com slot `[pageActions]`
  - `CrudActions` (root): `openForm<C, D>(component: Type<C>, header: string, data?: D): Observable<boolean>`; `confirmAndRun(action: 'archive' | 'delete', name: string, operation: () => Observable<unknown>): Observable<void>`; `run(operation, successKey): Observable<void>`

Uso típico (plano 0b3):
```html
<app-crud-page title="accounts.title" (create)="openForm()">
  <app-filter-bar [fields]="filters" [value]="list.filter()" [initial]="initialFilter" (changed)="list.setFilter($event)" />
  <app-data-table [columns]="columns" [list]="list" [actions]="actions" (action)="onAction($event)" />
</app-crud-page>
```

- [ ] **Step 1: Barra de filtros**

Create `src/app/shared/crud/filter-bar.component.ts`:
```ts
import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { Button } from 'primeng/button';
import { Checkbox } from 'primeng/checkbox';
import { DatePicker } from 'primeng/datepicker';
import { Drawer } from 'primeng/drawer';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { debounceTime, distinctUntilChanged, map, merge } from 'rxjs';

import type { FilterField, FilterValue, LookupOption } from './filter';
import { countActiveFilters, filterToForm, formToFilter, sameFilter } from './filter';

/**
 * Filtros declarativos. Texto aplica com debounce de 300 ms; os demais ao mudar.
 * No desktop ficam em linha; abaixo de 1024 px, num drawer com contador de filtros ativos.
 */
@Component({
  selector: 'app-filter-bar',
  imports: [
    NgTemplateOutlet,
    ReactiveFormsModule,
    TranslocoPipe,
    Button,
    Checkbox,
    DatePicker,
    Drawer,
    InputText,
    Select,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './filter-bar.component.html',
})
export class FilterBarComponent<F extends object> {
  readonly fields = input.required<readonly FilterField[]>();
  readonly value = input.required<Partial<F>>();
  /** Valor do botão "Limpar" (normalmente o initialFilter da lista). */
  readonly initial = input<Partial<F>>({});
  readonly changed = output<Partial<F>>();

  private readonly transloco = inject(TranslocoService);
  protected readonly drawerOpen = signal(false);
  protected readonly form = computed(
    () => new FormGroup(Object.fromEntries(this.fields().map((f) => [f.key, new FormControl<unknown>(null)]))),
  );
  protected readonly activeCount = computed(() =>
    countActiveFilters(this.fields(), this.value() as FilterValue, this.initial() as FilterValue),
  );

  constructor() {
    // Mudanças do formulário → filtro (texto com debounce).
    effect((onCleanup) => {
      const form = this.form();
      const fields = untracked(this.fields);
      const textChanges = fields
        .filter((f) => f.type === 'text')
        .map((f) => form.controls[f.key].valueChanges.pipe(debounceTime(300)));
      const otherChanges = fields.filter((f) => f.type !== 'text').map((f) => form.controls[f.key].valueChanges);
      const subscription = merge(...textChanges, ...otherChanges)
        .pipe(
          map(() => formToFilter(fields, form.getRawValue())),
          distinctUntilChanged(sameFilter),
        )
        .subscribe((filter) => {
          if (!sameFilter(filter, this.value())) this.changed.emit(filter as Partial<F>);
        });
      onCleanup(() => subscription.unsubscribe());
    });

    // Filtro de fora (URL, Limpar) → formulário. Não mexe se já for o mesmo (evita pular o cursor ao digitar).
    effect(() => {
      const value = this.value() as FilterValue;
      const form = this.form();
      untracked(() => {
        if (sameFilter(formToFilter(this.fields(), form.getRawValue()), value)) return;
        form.reset(filterToForm(this.fields(), value), { emitEvent: false });
      });
    });
  }

  protected clear(): void {
    this.changed.emit(this.initial());
    this.drawerOpen.set(false);
  }

  protected enumOptions(field: FilterField): { label: string; value: string }[] {
    if (field.type !== 'enum') return [];
    return field.options.map((value) => ({
      value,
      label: this.transloco.translate(`enums.${field.enumKey}.${value}`),
    }));
  }

  protected lookupOptions(field: FilterField): readonly LookupOption[] {
    return field.type === 'lookup' ? field.options() : [];
  }
}
```

Create `src/app/shared/crud/filter-bar.component.html`:
```html
<ng-template #fieldsTemplate let-prefix>
  <form [formGroup]="form()" class="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
    @for (field of fields(); track field.key) {
      @let id = prefix + field.key;
      <div class="flex flex-col gap-1 lg:w-56">
        @switch (field.type) {
          @case ('text') {
            <label [for]="id" class="text-sm text-muted-color">{{ field.label | transloco }}</label>
            <input pInputText [id]="id" [formControlName]="field.key" />
          }
          @case ('enum') {
            <label [for]="id" class="text-sm text-muted-color">{{ field.label | transloco }}</label>
            <p-select
              [inputId]="id"
              [formControlName]="field.key"
              [options]="enumOptions(field)"
              optionLabel="label"
              optionValue="value"
              [showClear]="true"
              [placeholder]="'common.all' | transloco"
              appendTo="body"
            />
          }
          @case ('lookup') {
            <label [for]="id" class="text-sm text-muted-color">{{ field.label | transloco }}</label>
            <p-select
              [inputId]="id"
              [formControlName]="field.key"
              [options]="$any(lookupOptions(field))"
              optionLabel="label"
              optionValue="value"
              [filter]="true"
              filterBy="label"
              [showClear]="true"
              [placeholder]="'common.all' | transloco"
              appendTo="body"
            >
              <ng-template #item let-option>
                <span class="flex items-center gap-2" [style.padding-left.rem]="(option.depth ?? 0) * 1.25">
                  @if (option.color) {
                    <span class="inline-block size-3 rounded-full" [style.background]="option.color"></span>
                  }
                  {{ option.label }}
                </span>
              </ng-template>
            </p-select>
          }
          @case ('dateRange') {
            <label [for]="id" class="text-sm text-muted-color">{{ field.label | transloco }}</label>
            <p-datepicker
              [inputId]="id"
              [formControlName]="field.key"
              selectionMode="range"
              dateFormat="dd/mm/yy"
              [showButtonBar]="true"
              [readonlyInput]="true"
              appendTo="body"
            />
          }
          @case ('boolean') {
            <div class="flex items-center gap-2 lg:h-10">
              <p-checkbox [inputId]="id" [formControlName]="field.key" [binary]="true" />
              <label [for]="id" class="text-sm">{{ field.label | transloco }}</label>
            </div>
          }
        }
      </div>
    }
    <p-button
      type="button"
      icon="pi pi-filter-slash"
      severity="secondary"
      [text]="true"
      [label]="'common.clearFilters' | transloco"
      (onClick)="clear()"
    />
  </form>
</ng-template>

<div class="mb-4 hidden lg:block">
  <ng-container *ngTemplateOutlet="fieldsTemplate; context: { $implicit: 'filter-' }" />
</div>

<div class="mb-4 lg:hidden">
  <p-button
    icon="pi pi-filter"
    severity="secondary"
    [outlined]="true"
    [label]="'common.filters' | transloco"
    [badge]="activeCount() ? '' + activeCount() : undefined"
    (onClick)="drawerOpen.set(true)"
  />
</div>

<p-drawer [(visible)]="drawerOpen" position="right" [header]="'common.filters' | transloco">
  <ng-container *ngTemplateOutlet="fieldsTemplate; context: { $implicit: 'filter-drawer-' }" />
</p-drawer>
```

- [ ] **Step 2: Moldura e ações**

Create `src/app/shared/crud/crud-page.component.ts`:
```ts
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Button } from 'primeng/button';

/** Moldura das telas de cadastro: título, ações extras (atributo pageActions) e botão "Novo". */
@Component({
  selector: 'app-crud-page',
  imports: [TranslocoPipe, Button],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="flex flex-col gap-4">
      <header class="flex flex-wrap items-center gap-3">
        <h1 class="m-0 flex-1 text-2xl font-semibold">{{ title() | transloco }}</h1>
        <ng-content select="[pageActions]" />
        @if (showCreate()) {
          <p-button icon="pi pi-plus" [label]="'common.new' | transloco" (onClick)="create.emit()" />
        }
      </header>
      <ng-content />
    </section>
  `,
})
export class CrudPageComponent {
  readonly title = input.required<string>(); // chave i18n
  readonly showCreate = input(true);
  readonly create = output();
}
```

Create `src/app/shared/crud/crud-actions.ts`:
```ts
import type { Type } from '@angular/core';
import { Injectable, inject } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { ConfirmationService } from 'primeng/api';
import { DialogService } from 'primeng/dynamicdialog';
import { Observable, map, of, tap } from 'rxjs';

import { Notifier } from '../ui/notifier';

export type ConfirmAction = 'archive' | 'delete';

/** O que toda tela de cadastro repete: abrir formulário em diálogo, confirmar e executar, toast de sucesso. */
@Injectable({ providedIn: 'root' })
export class CrudActions {
  private readonly dialog = inject(DialogService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly transloco = inject(TranslocoService);
  private readonly notifier = inject(Notifier);

  /** Abre o componente num diálogo. Emite true se o formulário salvou (ref.close(true)). */
  openForm<C, D>(component: Type<C>, header: string, data?: D): Observable<boolean> {
    const ref = this.dialog.open(component, {
      header: this.transloco.translate(header),
      data,
      modal: true,
      closable: true,
      focusOnShow: false,
      width: '32rem',
      breakpoints: { '640px': '95vw' },
    });
    return ref ? ref.onClose.pipe(map((saved: unknown) => saved === true)) : of(false);
  }

  /** Pergunta ("Arquivar \"Nubank\"?"), executa e mostra o toast de sucesso. Completa sem emitir se o usuário recusar. */
  confirmAndRun(action: ConfirmAction, name: string, operation: () => Observable<unknown>): Observable<void> {
    return new Observable<void>((subscriber) => {
      this.confirmation.confirm({
        header: this.transloco.translate(`common.confirm.${action}.header`),
        message: this.transloco.translate(`common.confirm.${action}.message`, { name }),
        icon: 'pi pi-exclamation-triangle',
        acceptLabel: this.transloco.translate(`common.${action}`),
        rejectLabel: this.transloco.translate('common.cancel'),
        acceptButtonProps: { severity: action === 'delete' ? 'danger' : 'primary' },
        rejectButtonProps: { severity: 'secondary', text: true },
        accept: () => this.run(operation, `common.success.${action}`).subscribe(subscriber),
        reject: () => subscriber.complete(),
      });
    });
  }

  /** Executa e mostra o toast de sucesso (sem confirmação). Erros já são tratados pelo errorInterceptor. */
  run(operation: () => Observable<unknown>, successKey: string): Observable<void> {
    return operation().pipe(
      map(() => undefined),
      tap(() => this.notifier.success(successKey)),
    );
  }
}
```

- [ ] **Step 3: Verificar**

Run: `npm run lint && npm test -- --watch=false && npm run build`
Expected: lint limpo, todos os testes passando (~85 no total) e build sem erros.

- [ ] **Step 4: Commit**

```bash
git add src/app/shared/crud
git commit -m "feat(shared): adiciona barra de filtros, moldura de cadastro e CrudActions

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Verificação final da fase 0b.1

**Files:** nenhum.

- [ ] **Step 1: Regra de dependência entre camadas**

Run: `grep -rnE "from '(@core|\.\./\.\./core|@features)" src/app/shared || echo OK`
Expected: `OK` (nada em `shared/` importa `core/` ou `features/`).

- [ ] **Step 2: Rodar tudo**

Run: `npm run lint && npm test -- --watch=false && npm run build`
Expected: tudo passa.

- [ ] **Step 3: Estado do git**

Run: `git status --short && git log --oneline -9`
Expected: working tree limpo; 8 commits desta fase.
