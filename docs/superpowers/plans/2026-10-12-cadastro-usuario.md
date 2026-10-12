# Cadastro de usuário Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar a tela `/register` (cadastro de nome, e-mail e senha), que autentica o usuário ao final e o leva ao dashboard, com links cruzados entre login e cadastro.

**Architecture:** O cadastro reaproveita a infraestrutura de autenticação já existente: `AuthApiService.register()` e `AuthStoreService.register()` já gravam a sessão e carregam o `/me`. Falta a rota pública `/register` (protegida pelo `guestGuard`), a página com Reactive Forms tipados sobre `injectFormSubmit` (mesmo padrão do login) e as traduções. A única lógica nova testável é o `register()` do store, então ela ganha teste unitário; a página segue a política de testes do projeto (sem teste de componente).

**Tech Stack:** Angular 21 (standalone, signals, OnPush), PrimeNG 21 (`p-password`, `p-button`, `p-message`, `pInputText`), Transloco (escopo `auth`, só `pt-BR`), Vitest via `ng test`.

**Spec:** `docs/escopo-frontend.md` (seções 5.5 Autenticação, 9 Testes, 11 Telas e rotas, 14 Roadmap)

## Global Constraints

- Angular 21 standalone, signals e OnPush em todos os componentes (escopo §15).
- Reactive Forms tipados com `NonNullableFormBuilder` (escopo §15).
- Erros de API: 409/422 aparecem no formulário pelo `detail` (via `injectFormSubmit`); erros de campo vêm do servidor e são aplicados nos controles.
- Textos em `public/i18n/auth/pt-BR.json` (escopo §8, i18n); nenhum texto fixo no template.
- Só testes unitários de lógica (escopo §9): não criar teste de componente para a página.
- Commits em português no padrão `tipo: descrição` do repositório.

---

## File Structure

| Arquivo | Ação | Responsabilidade |
|---|---|---|
| `src/app/core/auth/auth-store.service.spec.ts` | Modify | Testes do `register()` (sucesso e erro) |
| `src/app/features/auth/register.routes.ts` | Create | Rota lazy `''` da página de cadastro, com escopo Transloco `auth` |
| `src/app/features/auth/register.page.ts` | Create | Formulário de cadastro e envio via `AuthStoreService.register()` |
| `src/app/features/auth/register.page.html` | Create | Template do cadastro, no mesmo layout do login |
| `src/app/app.routes.ts` | Modify | Nova rota `register` com `guestGuard` |
| `public/i18n/auth/pt-BR.json` | Modify | Chaves do cadastro e dos links cruzados |
| `src/app/features/auth/login.page.ts` | Modify | Importa `RouterLink` |
| `src/app/features/auth/login.page.html` | Modify | Link "Não tem conta? Cadastre-se" |

---

### Task 1: Testes do `register()` no AuthStoreService

O método `register()` já existe em `src/app/core/auth/auth-store.service.ts` e chama `api.register()` e depois `startFromToken()`. Esta tarefa só cobre o comportamento com testes, que ainda não existem.

**Files:**
- Modify: `src/app/core/auth/auth-store.service.spec.ts` (inserir antes do `it('restoreSession descarta sessão expirada', ...)`)

**Interfaces:**
- Consumes: `AuthStoreService.register(data: RegisterRequest, context?: HttpContext): Observable<void>` (já existente); `SESSION_STORAGE_KEY`, `readSession` de `auth-storage.ts` (já importados no spec).
- Produces: nada para as tarefas seguintes.

- [ ] **Step 1: Escrever os testes que falham**

Inserir estes dois casos dentro do `describe('AuthStoreService', ...)`, logo após o teste `login grava a sessão com a expiração e carrega o usuário`:

```ts
  it('register grava a sessão e carrega o usuário', () => {
    vi.useFakeTimers({ now: new Date(2026, 9, 12, 10, 0) });
    const store = TestBed.inject(AuthStoreService);
    let done = false;

    store
      .register({ name: 'Gabriel', email: 'demo@myfinance.dev', password: '12345678' })
      .subscribe(() => (done = true));
    http.expectOne('/api/v1/auth/register').flush({ accessToken: 'jwt', tokenType: 'Bearer', expiresIn: 3600 });
    http.expectOne('/api/v1/me').flush(user);

    expect(done).toBe(true);
    expect(store.isAuthenticated()).toBe(true);
    expect(store.token()).toBe('jwt');
    expect(store.user()?.name).toBe('Gabriel');
    expect(readSession()).toEqual({ token: 'jwt', expiresAt: Date.now() + 3600 * 1000 });
  });

  it('register com erro não inicia a sessão', () => {
    const store = TestBed.inject(AuthStoreService);
    let failed = false;

    store
      .register({ name: 'Gabriel', email: 'demo@myfinance.dev', password: '12345678' })
      .subscribe({ error: () => (failed = true) });
    http
      .expectOne('/api/v1/auth/register')
      .flush({ detail: 'E-mail já cadastrado.' }, { status: 409, statusText: 'Conflict' });

    expect(failed).toBe(true);
    expect(store.isAuthenticated()).toBe(false);
    expect(localStorage.getItem(SESSION_STORAGE_KEY)).toBeNull();
  });
```

- [ ] **Step 2: Rodar o teste e confirmar a falha esperada**

Run: `npx ng test --include src/app/core/auth/auth-store.service.spec.ts`
Expected: a suíte roda; se o `register()` já estiver correto, os dois casos passam (ele é o caminho existente). Qualquer falha tem que ser lida antes de seguir: se o `expectOne` não encontrar a URL, verificar `environment.apiUrl`.

- [ ] **Step 3: Ajustar a implementação só se o teste revelar um defeito**

Nenhuma mudança é esperada em `auth-store.service.ts`. Se o teste de erro mostrar que `isAuthenticated` ficou `true`, corrigir o `register()` para que o `switchMap` (`startFromToken`) só rode em sucesso. O `switchMap` já faz isso; não adicionar código além do necessário.

- [ ] **Step 4: Rodar a suíte completa**

Run: `npm test`
Expected: todos os testes passam, incluindo os dois novos.

- [ ] **Step 5: Commit**

```bash
git add src/app/core/auth/auth-store.service.spec.ts
git commit -m "test: cobre o cadastro no AuthStoreService (sucesso e erro)" -m "Co-Authored-By: Claude Haiku 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Página de cadastro, rota e traduções

Entrega o `/register` funcional: formulário com nome, e-mail e senha, envio, erros do servidor no formulário e redirecionamento para `/dashboard`.

**Files:**
- Create: `src/app/features/auth/register.routes.ts`
- Create: `src/app/features/auth/register.page.ts`
- Create: `src/app/features/auth/register.page.html`
- Modify: `src/app/app.routes.ts:6` (adicionar a rota `register` logo após a linha da rota `login`)
- Modify: `public/i18n/auth/pt-BR.json`

**Interfaces:**
- Consumes: `AuthStoreService.register(data: RegisterRequest, context?: HttpContext): Observable<void>` (Task 1 cobre o comportamento); `injectFormSubmit(form, operation, onSuccess)` e `FieldComponent` de `@shared/forms`; `guestGuard` de `core/auth/auth.guards`.
- Produces: rota `/register` (lazy, `features/auth/register.routes`); classe `RegisterPage` (não usada por outras tarefas).

- [ ] **Step 1: Criar as rotas da página**

Criar `src/app/features/auth/register.routes.ts` com o mesmo formato de `auth.routes.ts`:

```ts
import type { Routes } from '@angular/router';
import { provideTranslocoScope } from '@jsverse/transloco';

import { RegisterPage } from './register.page';

export default [{ path: '', component: RegisterPage, providers: [provideTranslocoScope('auth')] }] satisfies Routes;
```

- [ ] **Step 2: Registrar a rota pública em `app.routes.ts`**

Em `src/app/app.routes.ts`, logo após a linha `{ path: 'login', canActivate: [guestGuard], loadChildren: () => import('./features/auth/auth.routes') },`, adicionar:

```ts
  { path: 'register', canActivate: [guestGuard], loadChildren: () => import('./features/auth/register.routes') },
```

- [ ] **Step 3: Criar o componente**

Criar `src/app/features/auth/register.page.ts`:

```ts
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthStoreService } from '@core/auth/auth-store.service';
import { TranslocoPipe } from '@jsverse/transloco';
import { FieldComponent } from '@shared/forms';
import { injectFormSubmit } from '@shared/forms';
import { Button } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { Message } from 'primeng/message';
import { Password } from 'primeng/password';

@Component({
  selector: 'app-register-page',
  imports: [ReactiveFormsModule, RouterLink, TranslocoPipe, FieldComponent, Button, InputText, Message, Password],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './register.page.html',
})
export class RegisterPage {
  private readonly auth = inject(AuthStoreService);
  private readonly router = inject(Router);

  // Limites do contrato de POST /auth/register (name 120, email 254, senha 8 a 72).
  protected readonly form = inject(NonNullableFormBuilder).group({
    name: ['', [Validators.required, Validators.maxLength(120)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(254)]],
    password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(72)]],
  });
  protected readonly submit = injectFormSubmit(
    this.form,
    (value, context) => this.auth.register(value, context),
    () => void this.router.navigateByUrl('/dashboard'),
  );
}
```

- [ ] **Step 4: Criar o template**

Criar `src/app/features/auth/register.page.html`, no mesmo layout de `login.page.html`:

```html
<main class="flex min-h-screen items-center justify-center p-4">
  <section class="w-full max-w-sm rounded-border border border-surface bg-surface-0 p-6 shadow-sm dark:bg-surface-900">
    <header class="mb-6 flex flex-col gap-1">
      <span class="flex items-center gap-2 text-xl font-semibold">
        <i class="pi pi-wallet"></i>
        {{ 'app.name' | transloco }}
      </span>
      <h1 class="m-0 text-2xl font-semibold">{{ 'auth.register.title' | transloco }}</h1>
      <p class="m-0 text-muted-color">{{ 'auth.register.subtitle' | transloco }}</p>
    </header>

    <form [formGroup]="form" (ngSubmit)="submit.submit()" class="flex flex-col gap-4">
      <app-field label="auth.fields.name" fieldId="register-name" [control]="form.controls.name">
        <input pInputText id="register-name" type="text" autocomplete="name" formControlName="name" />
      </app-field>

      <app-field label="auth.fields.email" fieldId="register-email" [control]="form.controls.email">
        <input pInputText id="register-email" type="email" autocomplete="username" formControlName="email" />
      </app-field>

      <app-field label="auth.fields.password" fieldId="register-password" [control]="form.controls.password">
        <p-password
          inputId="register-password"
          formControlName="password"
          autocomplete="new-password"
          [feedback]="false"
          [toggleMask]="true"
          [fluid]="true"
        />
      </app-field>

      @if (submit.error(); as message) {
        <p-message severity="error">{{ message }}</p-message>
      }

      <p-button type="submit" [label]="'auth.register.submit' | transloco" [loading]="submit.submitting()" [fluid]="true" />

      <a routerLink="/login" class="text-center text-sm text-primary">{{ 'auth.register.link' | transloco }}</a>
    </form>
  </section>
</main>
```

- [ ] **Step 5: Adicionar as traduções**

Em `public/i18n/auth/pt-BR.json`, o arquivo passa a ser exatamente:

```json
{
  "title": "Entrar",
  "subtitle": "Suas finanças e investimentos em um só lugar.",
  "fields": {
    "name": "Nome",
    "email": "E-mail",
    "password": "Senha"
  },
  "submit": "Entrar",
  "link": "Não tem conta? Cadastre-se",
  "register": {
    "title": "Criar conta",
    "subtitle": "Leva menos de um minuto.",
    "submit": "Cadastrar",
    "link": "Já tem conta? Entrar"
  }
}
```

Observação: `auth.link` é o link do login e `auth.register.link` é o do cadastro. As duas chaves são usadas nos templates das Tasks 2 e 3.

- [ ] **Step 6: Build e lint**

Run: `npm run build`
Expected: build sem erros de template (`@if`, `formControlName`, `routerLink` resolvidos).

Run: `npm run lint`
Expected: sem erros do angular-eslint/typescript-eslint nos arquivos novos.

- [ ] **Step 7: Verificação manual no navegador**

O protótipo não tem mais API mock (escopo §15), então é preciso o backend rodando em `http://localhost:8080`.

Run: `npm start` e abrir `http://localhost:4200/register` (sem sessão).
Expected:
- Enviar vazio mostra "Campo obrigatório" nos três campos.
- Senha com menos de 8 caracteres mostra "Mínimo de 8 caracteres" e não envia.
- Cadastro válido com e-mail novo cai em `/dashboard` com o nome no menu do usuário.
- Cadastro com e-mail já existente mostra o `detail` do servidor no formulário (409), sem toast.
- Com sessão ativa, `/register` redireciona para `/dashboard` (guestGuard).

Se o backend não estiver disponível, dizer isso na entrega; não marcar como verificado.

- [ ] **Step 8: Commit**

```bash
git add src/app/features/auth/register.routes.ts src/app/features/auth/register.page.ts src/app/features/auth/register.page.html src/app/app.routes.ts public/i18n/auth/pt-BR.json
git commit -m "feat: tela de cadastro em /register" -m "Co-Authored-By: Claude Haiku 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Link de cadastro na tela de login

Fecha o fluxo: quem não tem conta encontra o cadastro a partir do login.

**Files:**
- Modify: `src/app/features/auth/login.page.ts:2-3` (import de `RouterLink`) e `:6` (lista de `imports` do `@Component`)
- Modify: `src/app/features/auth/login.page.html` (após o botão de submit, dentro do `<form>`)

**Interfaces:**
- Consumes: chave `auth.link` (Task 2, `public/i18n/auth/pt-BR.json`); rota `/register` (Task 2).
- Produces: nada para as tarefas seguintes.

- [ ] **Step 1: Importar `RouterLink` no login**

Em `src/app/features/auth/login.page.ts`, trocar a linha `import { Router } from '@angular/router';` por:

```ts
import { Router, RouterLink } from '@angular/router';
```

E trocar a linha de `imports` do decorator por:

```ts
  imports: [ReactiveFormsModule, RouterLink, TranslocoPipe, FieldComponent, Button, InputText, Message, Password],
```

- [ ] **Step 2: Adicionar o link no template**

Em `src/app/features/auth/login.page.html`, logo após a linha do `<p-button type="submit" ... />`, dentro do `<form>`, adicionar:

```html
      <a routerLink="/register" class="text-center text-sm text-primary">{{ 'auth.link' | transloco }}</a>
```

- [ ] **Step 3: Build, lint e testes**

Run: `npm run build`
Expected: build sem erros.

Run: `npm run lint`
Expected: sem erros.

Run: `npm test`
Expected: todos os testes passam (inclui os da Task 1).

- [ ] **Step 4: Verificação manual**

Run: `npm start` e abrir `http://localhost:4200/login`.
Expected: o link "Não tem conta? Cadastre-se" aparece abaixo do botão "Entrar" e leva a `/register`. Em `/register`, o link "Já tem conta? Entrar" volta ao login.

- [ ] **Step 5: Commit**

```bash
git add src/app/features/auth/login.page.ts src/app/features/auth/login.page.html
git commit -m "feat: link de cadastro na tela de login" -m "Co-Authored-By: Claude Haiku 5.5 <noreply@anthropic.com>"
```

---

## Self-Review

**1. Cobertura do escopo** (`docs/escopo-frontend.md`):
- §5.5 (login/cadastro devolvem token, guardado com expiração; `GET /me`; `register()` no store; `guestGuard` em `/register`) → Task 1 (testes do store), Task 2 (rota `/register` com `guestGuard`, página usa `register()`).
- §11 (`/register` com `POST /auth/register`) → Task 2.
- §9 (testar só lógica; `AuthStoreService` tem teste) → Task 1; página sem teste de componente, conforme a política.
- §14 (cadastro na fase 0c) → o plano implementa agora, como pedido; a diferença de fase é apontada na entrega.
- Lacunas: nenhuma para o escopo do cadastro.

**2. Varredura de placeholders:** sem TBD/TODO. Todos os arquivos têm conteúdo completo. Os passos de verificação dizem o resultado esperado.

**3. Consistência de tipos e nomes:**
- `AuthStoreService.register(data: RegisterRequest, context?)` é usado com `{ name, email, password }`, que casa com `RegisterRequest` em `auth.model.ts`.
- `RegisterPage` (Task 2) é o `component` de `register.routes.ts` e o import é `./register.page`.
- Chaves i18n: `auth.fields.name` (nova), `auth.fields.email`/`auth.fields.password` (existentes), `auth.register.{title,subtitle,submit,link}` (Task 2), `auth.link` (Task 2, usada na Task 3). Todas estão no JSON da Task 2.
- Nomes dos controles (`name`, `email`, `password`) batem com os campos do `RegisterRequest`, então `applyServerErrors` mapeia erros 422 corretamente.
