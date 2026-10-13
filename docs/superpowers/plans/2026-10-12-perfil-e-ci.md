# Perfil, CI e i18n:check Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar a página `/profile` (nome editável, e-mail e data de cadastro só leitura, com "Perfil" no menu do usuário), o workflow de CI e o `npm run i18n:check`, fechando as pendências das fases 0c e 1 do escopo.

**Architecture:** O perfil segue o mesmo padrão do cadastro: página standalone com Reactive Forms tipados sobre `injectFormSubmit`, e um service HTTP fino de feature. O único código de lógica nova é `AuthStoreService.setUser()`, que recebe o usuário devolvido pelo `PUT /me` para o nome do menu atualizar sem novo `GET /me`; ele ganha teste unitário. A CI e o `i18n:check` são configuração: a verificação é rodar os comandos.

**Tech Stack:** Angular 21 (standalone, signals, OnPush), PrimeNG 21 (`p-button`, `p-message`, `pInputText`), Transloco (escopo `profile`, só `pt-BR`), Vitest via `ng test`, `@jsverse/transloco-keys-manager`, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-10-12-features-faltantes-design.md` (seção 3.1, entrega A); `docs/escopo-frontend.md` (seções 5.5, 6.2, 8, 9, 11, 14).

## Global Constraints

- Angular 21 standalone, signals e OnPush em todos os componentes (escopo §15).
- Reactive Forms tipados com `NonNullableFormBuilder` (escopo §15).
- Erros de API: 409/422 aparecem no formulário pelo `detail` (via `injectFormSubmit`); erros de campo são aplicados nos controles.
- Textos em `public/i18n/` (escopo §7); nenhum texto fixo no template.
- Só testes unitários de lógica (escopo §9): não criar teste de componente para a página.
- Commits em português no padrão `tipo: descrição` do repositório.
- Pressuposto: o body do `PUT /me` é `{ name }` (spec 3.1). Se o backend recusar esse corpo, parar e reportar antes de seguir.

---

## File Structure

| Arquivo | Ação | Responsabilidade |
|---|---|---|
| `src/app/core/auth/auth-store.service.ts` | Modify | Novo `setUser()` que substitui o usuário carregado |
| `src/app/core/auth/auth-store.service.spec.ts` | Modify | Teste do `setUser()` |
| `src/app/features/profile/data/profile.model.ts` | Create | `UpdateProfileRequest` |
| `src/app/features/profile/data/profile-api.service.ts` | Create | `PUT /me` |
| `src/app/features/profile/profile.page.ts` | Create | Formulário do perfil e envio |
| `src/app/features/profile/profile.page.html` | Create | Template do perfil |
| `src/app/features/profile/profile.routes.ts` | Create | Rota lazy `''` com escopo Transloco `profile` |
| `src/app/app.routes.ts` | Modify | Rota `profile` dentro do shell |
| `src/app/core/layout/user-menu.component.ts` | Modify | Item "Perfil" no menu do usuário |
| `public/i18n/pt-BR.json` | Modify | Chave `user.profile` |
| `public/i18n/profile/pt-BR.json` | Create | Textos da página de perfil |
| `package.json` | Modify | Dev dependency e script `i18n:check` |
| `.github/workflows/ci.yml` | Create | Pipeline: lint, test, build, i18n:check |

---

### Task 1: `AuthStoreService.setUser()`

Permite que outra tela troque o usuário carregado (depois de editar o perfil) sem chamar `/me` de novo.

**Files:**
- Modify: `src/app/core/auth/auth-store.service.ts` (inserir o método antes de `private startFromToken`)
- Modify: `src/app/core/auth/auth-store.service.spec.ts` (inserir o teste após `register com erro não inicia a sessão`)

**Interfaces:**
- Consumes: `AuthStoreService.user` (já existente, `Signal<User | null>`); `User` de `auth.model.ts`.
- Produces: `AuthStoreService.setUser(user: User): void`, usado pela Task 2.

- [ ] **Step 1: Escrever o teste que falha**

Inserir no `describe('AuthStoreService', ...)`, logo após o teste `register com erro não inicia a sessão`:

```ts
  it('setUser substitui o usuário carregado', () => {
    vi.useFakeTimers({ now: new Date(2026, 9, 12, 10, 0) });
    const store = TestBed.inject(AuthStoreService);

    store.login({ email: 'demo@myfinance.dev', password: '12345678' }).subscribe();
    http.expectOne('/api/v1/auth/login').flush({ accessToken: 'jwt', tokenType: 'Bearer', expiresIn: 3600 });
    http.expectOne('/api/v1/me').flush(user);

    store.setUser({ ...user, name: 'Gabriel Fonseca' });

    expect(store.user()?.name).toBe('Gabriel Fonseca');
    expect(store.isAuthenticated()).toBe(true);
  });
```

- [ ] **Step 2: Rodar o teste e confirmar a falha**

Run: `npx ng test --include src/app/core/auth/auth-store.service.spec.ts`
Expected: FAIL com `store.setUser is not a function` (erro de compilação ou de execução).

- [ ] **Step 3: Implementar o método**

Em `src/app/core/auth/auth-store.service.ts`, inserir antes da linha `  private startFromToken(token: TokenResponse): Observable<void> {`:

```ts
  /** Substitui o usuário carregado (ex.: depois de editar o perfil), sem nova chamada ao /me. */
  setUser(user: User): void {
    this.userState.set(user);
  }

```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `npx ng test --include src/app/core/auth/auth-store.service.spec.ts`
Expected: PASS, incluindo o novo caso e os de login e cadastro já existentes.

- [ ] **Step 5: Commit**

```bash
git add src/app/core/auth/auth-store.service.ts src/app/core/auth/auth-store.service.spec.ts
git commit -m "feat: AuthStoreService.setUser para atualizar o usuário após editar o perfil" -m "Co-Authored-By: Claude Haiku 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Página `/profile` e item "Perfil" no menu

Entrega a tela de perfil completa: rota protegida, formulário, envio para `PUT /me`, atualização do menu e o item de acesso no menu do usuário.

**Files:**
- Create: `src/app/features/profile/data/profile.model.ts`
- Create: `src/app/features/profile/data/profile-api.service.ts`
- Create: `src/app/features/profile/profile.page.ts`
- Create: `src/app/features/profile/profile.page.html`
- Create: `src/app/features/profile/profile.routes.ts`
- Create: `public/i18n/profile/pt-BR.json`
- Modify: `src/app/app.routes.ts` (rota `profile` dentro do shell)
- Modify: `src/app/core/layout/user-menu.component.ts` (item "Perfil")
- Modify: `public/i18n/pt-BR.json` (chave `user.profile`)

**Interfaces:**
- Consumes: `AuthStoreService.user()` e `AuthStoreService.setUser(user)` (Task 1); `User` de `@core/auth/auth.model`; `injectFormSubmit(form, operation, onSuccess)` e `FieldComponent` de `@shared/forms`; `NotifierService.success(key)` de `@shared/ui`; chave global `common.success.saved` (já existente em `public/i18n/pt-BR.json`).
- Produces: rota `/profile`; `ProfileApiService.update(body, context?)`; `UpdateProfileRequest`. Nada é usado pela Task 3 nem pela Task 4.

- [ ] **Step 1: Criar o model**

Criar `src/app/features/profile/data/profile.model.ts`:

```ts
export interface UpdateProfileRequest {
  name: string;
}
```

- [ ] **Step 2: Criar o service HTTP**

Criar `src/app/features/profile/data/profile-api.service.ts`:

```ts
import type { HttpContext } from '@angular/common/http';
import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { User } from '@core/auth/auth.model';
import { environment } from '@env/environment';
import type { Observable } from 'rxjs';

import type { UpdateProfileRequest } from './profile.model';

@Injectable({ providedIn: 'root' })
export class ProfileApiService {
  private readonly http = inject(HttpClient);

  update(body: UpdateProfileRequest, context?: HttpContext): Observable<User> {
    return this.http.put<User>(`${environment.apiUrl}/me`, body, { context });
  }
}
```

- [ ] **Step 3: Criar o componente**

Criar `src/app/features/profile/profile.page.ts`:

```ts
import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthStoreService } from '@core/auth/auth-store.service';
import { TranslocoPipe } from '@jsverse/transloco';
import { FieldComponent, injectFormSubmit } from '@shared/forms';
import { NotifierService } from '@shared/ui';
import { Button } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { Message } from 'primeng/message';

import { ProfileApiService } from './data/profile-api.service';

@Component({
  selector: 'app-profile-page',
  imports: [DatePipe, ReactiveFormsModule, TranslocoPipe, FieldComponent, Button, InputText, Message],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './profile.page.html',
})
export class ProfilePage {
  private readonly api = inject(ProfileApiService);
  private readonly notifier = inject(NotifierService);
  protected readonly auth = inject(AuthStoreService);

  // Mesmo limite de nome do cadastro (120) no contrato de PUT /me.
  protected readonly form = inject(NonNullableFormBuilder).group({
    name: [this.auth.user()?.name ?? '', [Validators.required, Validators.maxLength(120)]],
  });
  protected readonly submit = injectFormSubmit(
    this.form,
    (value, context) => this.api.update(value, context),
    (user) => {
      this.auth.setUser(user);
      this.notifier.success('common.success.saved');
    },
  );
}
```

- [ ] **Step 4: Criar o template**

Criar `src/app/features/profile/profile.page.html`:

```html
<main class="mx-auto flex max-w-xl flex-col gap-6 p-4">
  <header class="flex flex-col gap-1">
    <h1 class="m-0 text-2xl font-semibold">{{ 'profile.title' | transloco }}</h1>
    <p class="m-0 text-muted-color">{{ 'profile.subtitle' | transloco }}</p>
  </header>

  <section class="rounded-border border border-surface bg-surface-0 p-6 dark:bg-surface-900">
    <form [formGroup]="form" (ngSubmit)="submit.submit()" class="flex flex-col gap-4">
      <app-field label="profile.fields.name" fieldId="profile-name" [control]="form.controls.name">
        <input pInputText id="profile-name" type="text" autocomplete="name" formControlName="name" />
      </app-field>

      <dl class="m-0 grid grid-cols-[max-content_1fr] gap-x-4 gap-y-2 text-sm">
        <dt class="text-muted-color">{{ 'profile.fields.email' | transloco }}</dt>
        <dd class="m-0">{{ auth.user()?.email }}</dd>

        <dt class="text-muted-color">{{ 'profile.fields.createdAt' | transloco }}</dt>
        <dd class="m-0">{{ auth.user()?.createdAt | date: 'dd/MM/yyyy' }}</dd>
      </dl>

      @if (submit.error(); as message) {
        <p-message severity="error">{{ message }}</p-message>
      }

      <p-button type="submit" [label]="'common.save' | transloco" [loading]="submit.submitting()" />
    </form>
  </section>
</main>
```

- [ ] **Step 5: Criar as rotas e registrar no shell**

Criar `src/app/features/profile/profile.routes.ts`:

```ts
import type { Routes } from '@angular/router';
import { provideTranslocoScope } from '@jsverse/transloco';

import { ProfilePage } from './profile.page';

export default [{ path: '', component: ProfilePage, providers: [provideTranslocoScope('profile')] }] satisfies Routes;
```

Em `src/app/app.routes.ts`, inserir antes da linha `      { path: '**', component: NotFoundPage },`:

```ts
      { path: 'profile', loadChildren: () => import('./features/profile/profile.routes') },
```

- [ ] **Step 6: Adicionar o item no menu do usuário**

Em `src/app/core/layout/user-menu.component.ts`, fazer as três alterações abaixo:

1. Trocar a linha `import { ChangeDetectionStrategy, Component, inject } from '@angular/core';` por:

```ts
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
```

2. Na classe, logo após a linha `  private readonly transloco = inject(TranslocoService);`, adicionar:

```ts
  private readonly router = inject(Router);
```

3. Trocar o array `items` inteiro por:

```ts
  protected readonly items: MenuItem[] = [
    {
      label: this.transloco.translate('user.profile'),
      icon: 'pi pi-user',
      command: () => void this.router.navigateByUrl('/profile'),
    },
    { label: this.transloco.translate('user.logout'), icon: 'pi pi-sign-out', command: () => this.auth.logout() },
  ];
```

- [ ] **Step 7: Adicionar as traduções**

Em `public/i18n/pt-BR.json`, dentro do objeto `"user"`, trocar:

```json
    "menu": "Menu do usuário",
    "logout": "Sair"
```

por:

```json
    "menu": "Menu do usuário",
    "profile": "Perfil",
    "logout": "Sair"
```

Criar `public/i18n/profile/pt-BR.json`:

```json
{
  "title": "Meu perfil",
  "subtitle": "Dados da sua conta.",
  "fields": {
    "name": "Nome",
    "email": "E-mail",
    "createdAt": "Membro desde"
  }
}
```

- [ ] **Step 8: Build, lint e testes**

Run: `npm run build`
Expected: build sem erros (template de `profile.page.html` resolve `transloco`, `formGroup`, `date`, `app-field`).

Run: `npm run lint`
Expected: sem erros nos arquivos novos. Se houver erro em arquivo que não foi tocado, registrar e não corrigir fora do escopo.

Run: `npm test`
Expected: todos os testes passam, incluindo o `setUser` da Task 1.

- [ ] **Step 9: Verificação manual**

Pré-requisito: backend em `http://localhost:8080`. Run: `npm start` e abrir `http://localhost:4200/profile` com sessão ativa.

Expected:
- O nome aparece preenchido; e-mail e "Membro desde" aparecem só leitura.
- Apagar o nome e salvar mostra "Campo obrigatório" e não envia.
- Trocar o nome e salvar mostra o toast "Salvo com sucesso." e o nome novo aparece no botão do menu do usuário, sem recarregar.
- Abrir o menu do usuário mostra "Perfil" acima de "Sair", e "Perfil" leva a `/profile`.
- Se o backend não estiver disponível, dizer isso na entrega; não marcar como verificado.

- [ ] **Step 10: Commit**

```bash
git add src/app/features/profile src/app/app.routes.ts src/app/core/layout/user-menu.component.ts public/i18n/pt-BR.json public/i18n/profile/pt-BR.json
git commit -m "feat: página de perfil em /profile com edição do nome" -m "Co-Authored-By: Claude Haiku 5.5 <noreply@anthropic.com>"
```

---

### Task 3: `npm run i18n:check`

Garante que chaves usadas e não declaradas (ou declaradas e não usadas) quebrem o build.

**Files:**
- Modify: `package.json` (dev dependency e script)
- Possivelmente: arquivo de configuração do keys-manager na raiz (criado só se a Step 3 exigir)
- Possivelmente: os JSON de `public/i18n/` e templates, para corrigir chaves que o check apontar

**Interfaces:**
- Consumes: as traduções de `public/i18n/` (incluindo as das Tasks 2 e do cadastro).
- Produces: script `i18n:check`, usado pela Task 4.

- [ ] **Step 1: Escolher a versão do keys-manager compatível**

Run: `npm view @jsverse/transloco-keys-manager peerDependencies --json`
Expected: um objeto com `@jsverse/transloco` no peer. Escolher a versão cujo peer aceita `8.x` (a versão de `@jsverse/transloco` em `package.json` é `^8.4.0`). Anotar a versão escolhida.

- [ ] **Step 2: Instalar e adicionar o script**

Run: `npm i -D @jsverse/transloco-keys-manager@<versão escolhida no Step 1>`
Expected: instalação sem erro de peer dependency. Se houver conflito de peer, parar e reportar a versão que conflita; não usar `--legacy-peer-deps` sem avisar.

Em `package.json`, dentro de `"scripts"`, inserir após a linha `"format": "prettier --write .",`:

```json
    "i18n:check": "transloco-keys-manager find --emit-error-on-extra-keys",
```

- [ ] **Step 3: Rodar e corrigir**

Run: `npm run i18n:check`
Expected: sai com código 0 e não lista chaves faltando nem sobrando.

Se o comando não encontrar as traduções em `public/i18n/` (ele procura por padrão em outro caminho), rodar `npx transloco-keys-manager --help` e configurar o caminho de traduções para `public/i18n` pelo arquivo de configuração da versão instalada, criando-o na raiz. Não remover o `--emit-error-on-extra-keys`.

Se o check reportar chave de escopo (`profile.title`, `auth.register.submit`) como não declarada, a causa é a configuração de escopos, não o código: ajustar a configuração para ler `public/i18n/<escopo>/pt-BR.json`. Não apagar a chave para silenciar o check.

Se reportar chave declarada e não usada, verificar antes de apagar: uma chave pode ser usada por código dinâmico (ex.: `enums.<enum>.<VALOR>`). Só remover quando for realmente morta, e registrar cada remoção na entrega.

- [ ] **Step 4: Confirmar que o check quebra de verdade**

Antes de commitar, provar que o check pega erro: adicionar temporariamente em `src/app/features/profile/profile.page.html` a chave `{{ 'profile.naoExiste' | transloco }}`, rodar `npm run i18n:check` e confirmar que sai com código diferente de 0 e cita a chave. Depois remover a linha temporária e rodar de novo até sair com 0.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json
git commit -m "build: adiciona npm run i18n:check com transloco-keys-manager" -m "Co-Authored-By: Claude Haiku 5.5 <noreply@anthropic.com>"
```

Se houve mudança em JSON, template ou arquivo de configuração na Step 3, incluir esses arquivos no mesmo commit ou em um commit próprio, `fix: ...`, e dizer qual foi na entrega.

---

### Task 4: Pipeline de CI

Roda lint, testes, build e i18n:check em todo push e pull request.

**Files:**
- Create: `.github/workflows/ci.yml`

**Interfaces:**
- Consumes: scripts `lint`, `test`, `build` e `i18n:check` do `package.json` (Tasks 2 e 3).
- Produces: nada.

- [ ] **Step 1: Criar o workflow**

Criar `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
  pull_request:

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm

      - run: npm ci
      - run: npm run lint
      - run: npm test
      - run: npm run build
      - run: npm run i18n:check
```

- [ ] **Step 2: Validar a sintaxe do YAML**

Run: `npx --yes js-yaml .github/workflows/ci.yml > /dev/null && echo OK`
Expected: imprime `OK`. Se falhar, corrigir a indentação e repetir.

- [ ] **Step 3: Rodar a mesma sequência localmente**

Run: `npm ci && npm run lint && npm test && npm run build && npm run i18n:check`
Expected: todos os comandos saem com código 0, na mesma ordem do workflow. Se um falhar, o workflow falharia igual: corrigir antes do commit, ou reportar o que já estava quebrado antes desta entrega, sem mascarar com `continue-on-error`.

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: lint, testes, build e i18n:check em push e pull request" -m "Co-Authored-By: Claude Haiku 5.5 <noreply@anthropic.com>"
```

A execução real do workflow só é conferida depois do push, na aba Actions do GitHub. Até lá, a entrega registra o que foi rodado localmente, não o resultado do CI remoto.

---

## Self-Review

**1. Cobertura da spec (entrega A, seção 3.1):**
- Perfil com nome editável, e-mail e data só leitura, `PUT /me` e atualização do menu → Task 1 (`setUser`), Task 2 (página, API, rota, menu).
- Item "Perfil" no menu do usuário → Task 2, Step 6.
- CI com lint, test, build, i18n:check, Node 22 → Task 4.
- `i18n:check` com dev dependency, script e ajuste dos achados → Task 3.
- Pressuposto do body `{ name }` → declarado nas Global Constraints e no Goal da Task 2.

**2. Varredura de placeholders:** sem TBD/TODO. Os pontos que dependem de algo que só aparece ao rodar (versão do keys-manager, configuração de caminho e escopos da Task 3) têm o comando para descobrir e a regra para decidir.

**3. Consistência de tipos e nomes:**
- `setUser(user: User): void` (Task 1) é o mesmo nome chamado em `profile.page.ts` (Task 2): `this.auth.setUser(user)`.
- `ProfileApiService.update(body: UpdateProfileRequest, context?: HttpContext): Observable<User>` (Task 2) é chamado como `this.api.update(value, context)`, e `value` tem o tipo `{ name: string }`, compatível com `UpdateProfileRequest`.
- Chaves i18n: `profile.title`, `profile.subtitle`, `profile.fields.{name,email,createdAt}` (Task 2) batem com o template; `user.profile` (Task 2) bate com `user-menu.component.ts`; `common.save` e `common.success.saved` já existem no JSON global.
- `injectFormSubmit` recebe `(value, context)` e `onSuccess(result)`, conforme a assinatura real em `shared/forms/form-submit.ts`.
