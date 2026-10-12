# Simplificação do protótipo: plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** remover a API mock, o OpenAPI e a sincronização do filtro com a URL; reorganizar `shared/crud` em subpastas com barrels; renomear os services para `*.service.ts` / `*Service`.

**Architecture:** o formulário do `filter-bar` passa a ser a única fonte do filtro, e a lista (`injectCrudList`) só recebe filtros prontos. Os models passam a ser interfaces escritas à mão. Cada tarefa é um commit independente que mantém o projeto compilando e com os testes passando.

**Tech Stack:** Angular 21 (standalone, signals, zoneless), PrimeNG 21, Transloco, Vitest (`@angular/build:unit-test`), ESLint, Prettier.

**Spec:** `docs/superpowers/specs/2026-10-12-simplificacao-prototipo-design.md`

## Global Constraints

- Angular 21 standalone: sem `NgModule`, signals, zoneless.
- Após a Tarefa 1, não existe código de API falsa nem `environment.mock.ts`.
- Transloco permanece. Todo texto visível continua vindo de chave i18n.
- Drawer de filtros no celular (< 1024 px) permanece, com o contador de filtros ativos.
- Nenhum arquivo de `src/api/` nem alias `@api/*` depois da Tarefa 2.
- Classes `@Injectable` e bases abstratas: arquivo `<nome>.service.ts`, classe `<Nome>Service`.
- Features importam de `shared/` só pelas barrels (`@shared/crud/table`, `@shared/forms`, `@shared/data`, `@shared/ui`, ...). Dentro de `shared/`, imports relativos ao arquivo, nunca barrel.
- Cada tarefa termina com `npm run lint`, `npm test` e `npm run build` sem erro.
- Mensagens de commit em português, no padrão do histórico (`refactor:`, `chore:`), com o trailer `Co-Authored-By: Claude Haiku 5.5 <noreply@anthropic.com>`.
- Os specs e planos anteriores em `docs/superpowers/` não são editados.

## File Structure

| Tarefa | Remove | Cria | Modifica |
|---|---|---|---|
| 1. Mock | `src/app/mock/`, `src/environments/environment.mock.ts` | — | `environment.ts`, `app.config.ts`, `angular.json`, `package.json`, `core/layout/user-menu.component.ts`, `features/auth/login.page.{ts,html}`, `public/i18n/pt-BR.json`, `public/i18n/auth/pt-BR.json` |
| 2. Models | `src/api/`, `openapi-typescript` | — | `tsconfig.json`, os 5 `*.model.ts` (ver passo) |
| 3. Renomes e `shared/` | `api-types` já removido na Tarefa 2 | barrels `index.ts` nos subpastas de `shared/` | arquivos de `shared/`, `core/`, `features/` (imports e nomes) |
| 4. Filtro | `shared/crud/list/list-state.ts` e spec | — | `filter-bar.component.{ts,html}`, `crud-list.ts`, `crud-list.spec.ts`, `account-list.page.{ts,html}`, `category-list.page.html`, `transaction-list.page.{ts,html}` |
| 5. Docs e verificação | — | — | `docs/escopo-frontend.md` (v0.3) |

---

## Tarefa 1: Remover a API mock

**Files:**
- Delete: `src/app/mock/` (pasta inteira), `src/environments/environment.mock.ts`
- Modify: `src/environments/environment.ts`, `src/app/app.config.ts:25`, `angular.json`, `package.json`, `src/app/core/layout/user-menu.component.ts`, `src/app/features/auth/login.page.ts:5,27`, `src/app/features/auth/login.page.html:35-37`, `public/i18n/pt-BR.json:22-23`, `public/i18n/auth/pt-BR.json:9`

**Interfaces:**
- Consumes: nada.
- Produces: `environment` com só `apiUrl: '/api/v1'`. `withInterceptors` sem interceptors de mock.

- [ ] **Step 1: Remover arquivos do mock**

```bash
cd /c/Users/gabri/WorkSpace/my-finance/my-finance-web
git rm -r -q src/app/mock src/environments/environment.mock.ts
```

- [ ] **Step 2: Simplificar `environment.ts`**

Substitua o conteúdo inteiro por:

```ts
export const environment = {
  apiUrl: '/api/v1',
};
```

- [ ] **Step 3: Remover o interceptor de mock do `app.config.ts`**

Substitua a linha 25:

```ts
      withInterceptors([authInterceptor, languageInterceptor, errorInterceptor]),
```

Confira com `grep -n "environment" src/app/app.config.ts`: o import de `environment` deve continuar existindo só se ainda for usado. Se não for, remova o import também.

- [ ] **Step 4: Remover as configurações `mock` do `angular.json`**

Apague o bloco `"mock": { ... }` dentro de `architect.build.configurations` (o que tem `fileReplacements`) e o bloco `"mock": { "buildTarget": "my-finance-web:build:mock" }` dentro de `architect.serve.configurations`. Ajuste as vírgulas. Valide:

```bash
node -e "JSON.parse(require('fs').readFileSync('angular.json','utf8')); console.log('ok')"
```

- [ ] **Step 5: Remover o script `start:mock` do `package.json`**

Apague a linha `"start:mock": "ng serve --configuration mock",` e valide com `node -e "JSON.parse(require('fs').readFileSync('package.json','utf8')); console.log('ok')"`.

- [ ] **Step 6: Reescrever `user-menu.component.ts` só com "Sair"**

Substitua o arquivo inteiro por:

```ts
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import type { MenuItem } from 'primeng/api';
import { Button } from 'primeng/button';
import { Menu } from 'primeng/menu';

import { AuthStore } from '../auth/auth.store';

/** Botão com o nome do usuário e menu (Sair). */
@Component({
  selector: 'app-user-menu',
  imports: [TranslocoPipe, Button, Menu],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p-button
      icon="pi pi-user"
      severity="secondary"
      [text]="true"
      [label]="auth.user()?.name ?? ''"
      [ariaLabel]="'user.menu' | transloco"
      (onClick)="menu.toggle($event)"
    />
    <p-menu #menu [model]="items" [popup]="true" appendTo="body" />
  `,
})
export class UserMenuComponent {
  protected readonly auth = inject(AuthStore);
  private readonly transloco = inject(TranslocoService);

  // As traduções globais já estão carregadas (provideI18n espera por elas na inicialização).
  protected readonly items: MenuItem[] = [
    { label: this.transloco.translate('user.logout'), icon: 'pi pi-sign-out', command: () => this.auth.logout() },
  ];
}
```

- [ ] **Step 7: Remover a dica de mock da tela de login**

Em `src/app/features/auth/login.page.ts`:
- apague a linha `import { environment } from '@env/environment';`
- apague a linha `protected readonly isMock = environment.useMockApi;`

Em `src/app/features/auth/login.page.html`, apague o bloco:

```html
    @if (isMock) {
      <p-message class="mt-4 block" severity="info" size="small">{{ 'auth.mockHint' | transloco }}</p-message>
    }
```

- [ ] **Step 8: Remover as chaves de tradução do mock**

Em `public/i18n/pt-BR.json`, apague as chaves `"expireSession"` e `"expireSessionDone"` do objeto `user` e ajuste a vírgula da linha anterior.

Em `public/i18n/auth/pt-BR.json`, apague a chave `"mockHint"` e a vírgula da linha `"submit": "Entrar",`.

Valide os dois:

```bash
node -e "for (const f of ['public/i18n/pt-BR.json','public/i18n/auth/pt-BR.json']) { JSON.parse(require('fs').readFileSync(f,'utf8')); console.log('ok', f) }"
```

- [ ] **Step 9: Conferir que não sobrou referência**

Run: `grep -rn "useMockApi\|mockInterceptors\|isMock\|mockHint\|expireSession\|__mock\|environment.mock\|start:mock" src public angular.json package.json`

Expected: nenhuma linha. A única exceção esperada é `AuthStore.expireSession()` em `src/app/core/auth/auth.store.ts` e no `error.interceptor`. Essa é a expiração real da sessão, e fica.

- [ ] **Step 10: Verificar lint, testes e build**

Run: `npm run lint && npm test && npm run build`
Expected: todos passam. Os specs de `mock/` já foram removidos, então não há casos a menos por falha.

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "refactor: remove a API mock do protótipo

Co-Authored-By: Claude Haiku 5.5 <noreply@anthropic.com>"
```

---

## Tarefa 2: Models escritos à mão (sem OpenAPI)

**Files:**
- Delete: `src/api/schema.d.ts`, `src/api/api-types.ts`, `src/api/api-types.spec.ts`
- Modify: `tsconfig.json:19` (alias `@api/*`), `package.json` (script `api:types`, devDependency `openapi-typescript`), `src/app/core/auth/auth.model.ts` (reescrito), `src/app/features/accounts/data/account.model.ts` (reescrito), `src/app/features/categories/data/category.model.ts` (bloco de tipos), `src/app/features/transactions/data/transaction.model.ts` (bloco de tipos), `src/app/features/dashboard/data/dashboard.model.ts` (reescrito)

**Interfaces:**
- Consumes: `LocalDate` e `YearMonth` de `@shared/data/dates`.
- Produces: os mesmos nomes de tipo de hoje (`Account`, `AccountSummary`, `AccountBalance`, `CreateAccountRequest`, `UpdateAccountRequest`, `AccountType`, `Category`, `CategorySummary`, `CreateCategoryRequest`, `UpdateCategoryRequest`, `CategoryType`, `Transaction`, `CreateTransactionRequest`, `UpdateTransactionRequest`, `CreateTransferRequest`, `TransactionType`, `TransactionStatus`, `DashboardSummary`, `CategoryExpense`, `ExpensesByCategory`, `LoginRequest`, `RegisterRequest`, `TokenResponse`, `User`). Só muda a forma, não os nomes.

- [ ] **Step 1: Confirmar o tipo de `LocalDate` e `YearMonth`**

Run: `grep -n "LocalDate\|YearMonth" src/app/shared/data/dates.ts | head -5`

Se `LocalDate` for um alias de `string`, os models usam `LocalDate` direto. Se for um tipo com marca (branded), os requests que recebem `date` também devem usar `LocalDate`, e o construtor do formulário de lançamento já converte. Os passos abaixo assumem alias de `string`. Se não for, ajuste o tipo do campo `date` e rode o build; ele aponta os lugares.

- [ ] **Step 2: Reescrever `core/auth/auth.model.ts`**

Substitua o arquivo inteiro por:

```ts
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
```

`UpdateMeRequest` do schema não é usado em lugar nenhum (o perfil ainda não existe), então não entra. Se a tela de perfil vier depois, ele é criado nela.

- [ ] **Step 3: Reescrever `features/accounts/data/account.model.ts`**

Substitua o arquivo inteiro por:

```ts
import type { LookupOption } from '@shared/crud/filter';

export const ACCOUNT_TYPES = ['CHECKING', 'SAVINGS', 'WALLET', 'INVESTMENT', 'OTHER'] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  institution: string | null;
  currency: string;
  initialBalance: number;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AccountSummary {
  id: string;
  name: string;
  type: AccountType;
}

export interface AccountBalance {
  accountId: string;
  initialBalance: number;
  currentBalance: number;
  projectedBalance: number;
}

export interface CreateAccountRequest {
  name: string;
  type: AccountType;
  institution?: string;
  initialBalance?: number;
}

export interface UpdateAccountRequest {
  name: string;
  type: AccountType;
  institution?: string;
  initialBalance: number;
}

/** Query params de GET /accounts e /accounts/options. */
export interface AccountFilter {
  name: string;
  type: AccountType;
  archived: boolean;
}

export function toAccountOptions(accounts: readonly AccountSummary[]): LookupOption[] {
  return accounts.map((account) => ({ value: account.id, label: account.name }));
}
```

- [ ] **Step 4: Trocar o bloco de tipos de `features/categories/data/category.model.ts`**

Apague a primeira linha (`import type { ApiResponse, ApiSchema } ...`) e as cinco linhas de `export type` que a seguem (até `CategoryType`). No lugar, coloque:

```ts
export const CATEGORY_TYPES = ['EXPENSE', 'INCOME'] as const;
export type CategoryType = (typeof CATEGORY_TYPES)[number];

export interface Category {
  id: string;
  parentId: string | null;
  name: string;
  type: CategoryType;
  color: string | null;
  icon: string | null;
  archived: boolean;
  system: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CategorySummary {
  id: string;
  name: string;
  type: CategoryType;
  color: string | null;
  icon: string | null;
  parentId: string | null;
}

export interface CreateCategoryRequest {
  name: string;
  type?: CategoryType;
  parentId?: string;
  color?: string;
  icon?: string;
}

export interface UpdateCategoryRequest {
  name: string;
  color?: string;
  icon?: string;
}
```

Depois apague a linha antiga `export const CATEGORY_TYPES = ['EXPENSE', 'INCOME'] as const satisfies readonly CategoryType[];`. O resto do arquivo (`CategoryFilter`, `CATEGORY_COLORS`, `CATEGORY_ICONS`, o comentário) não muda.

- [ ] **Step 5: Trocar o bloco de tipos de `features/transactions/data/transaction.model.ts`**

Substitua as linhas do topo até `export type TransactionStatus = Transaction['status'];` (inclusive) por:

```ts
import type { AccountSummary } from '@features/accounts';
import type { CategorySummary } from '@features/categories';
import type { LocalDate } from '@shared/data/dates';
import { toLocalDate } from '@shared/data/dates';

export const TRANSACTION_TYPES = ['INCOME', 'EXPENSE', 'TRANSFER'] as const;
export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export const TRANSACTION_STATUSES = ['PENDING', 'CLEARED'] as const;
export type TransactionStatus = (typeof TRANSACTION_STATUSES)[number];

/** Lançamento como a API devolve (conta, destino e categoria vêm resumidos). */
export interface Transaction {
  id: string;
  type: TransactionType;
  description: string;
  amount: number;
  date: LocalDate;
  status: TransactionStatus;
  account: AccountSummary;
  destinationAccount: AccountSummary | null;
  category: CategorySummary | null;
  creditCardInvoiceId: string | null;
  installmentGroupId: string | null;
  installmentNumber: number | null;
  installmentTotal: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTransactionRequest {
  type: TransactionType;
  description: string;
  amount: number;
  date: LocalDate;
  status?: TransactionStatus;
  accountId: string;
  categoryId: string;
  notes?: string;
}

export interface UpdateTransactionRequest {
  description: string;
  amount: number;
  date: LocalDate;
  status: TransactionStatus;
  accountId: string;
  destinationAccountId?: string;
  categoryId?: string;
  notes?: string;
}

export interface CreateTransferRequest {
  fromAccountId: string;
  toAccountId: string;
  description: string;
  amount: number;
  date: LocalDate;
  status?: TransactionStatus;
  notes?: string;
}
```

Apague as linhas antigas de `export const TRANSACTION_TYPES ... satisfies` e `TRANSACTION_STATUSES ... satisfies`, que ficavam mais abaixo. O resto (`TransactionFilter`, `ReadOnlyReason`, `readOnlyReason`, `toUpdateRequest`, `statusForDate`) permanece. Confira que `TransactionFilter` continua importando os tipos certos.

- [ ] **Step 6: Reescrever `features/dashboard/data/dashboard.model.ts`**

Substitua o arquivo inteiro por:

```ts
import type { YearMonth } from '@shared/data/dates';

export interface DashboardSummary {
  month: YearMonth;
  totalBalance: number;
  income: number;
  expenses: number;
  result: number;
}

export interface CategoryExpense {
  categoryId: string;
  name: string;
  color: string | null;
  icon: string | null;
  amount: number;
  percentage: number;
}

export interface ExpensesByCategory {
  month: YearMonth;
  total: number;
  categories: CategoryExpense[];
}
```

- [ ] **Step 7: Apagar `src/api/` e o alias**

```bash
git rm -r -q src/api
```

Em `tsconfig.json`, apague a linha `"@api/*": ["./src/api/*"],` e ajuste a vírgula. Valide com `node -e "JSON.parse(require('fs').readFileSync('tsconfig.json','utf8')); console.log('ok')"`. Observe que `tsconfig.json` pode ter comentários; se o parse falhar por isso, confira a linha à mão.

- [ ] **Step 8: Remover o script e a dependência do OpenAPI**

Apague a linha `"api:types": ...` do `package.json`. Depois:

```bash
npm uninstall openapi-typescript
```

Isso atualiza o `package.json` e o `package-lock.json`.

- [ ] **Step 9: Conferir que não sobrou referência**

Run: `grep -rn "@api/\|ApiResponse\|ApiSchema\|api-types\|openapi" src docs/escopo-frontend.md package.json tsconfig.json`

Expected: nenhuma linha em `src`, `package.json` e `tsconfig.json`. Em `docs/escopo-frontend.md` restam menções históricas, que são atualizadas na Tarefa 5.

- [ ] **Step 10: Verificar lint, testes e build**

Run: `npm run lint && npm test && npm run build`
Expected: todos passam. Se o build reclamar de um tipo, o erro aponta o campo; ajuste o model conforme o `schema.d.ts` que foi apagado (está no histórico: `git show HEAD:src/api/schema.d.ts`).

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "refactor: escreve os models à mão e remove o OpenAPI

Co-Authored-By: Claude Haiku 5.5 <noreply@anthropic.com>"
```

---

## Tarefa 3: Renomear services e reorganizar `shared/`

**Files:**
- Move (com `git mv`), ver o passo 1 para a lista exata.
- Create: `index.ts` em `shared/crud/{api,list,table,filter,page}/`, `shared/data/`, `shared/forms/`, `shared/ui/`.
- Modify: imports e nomes em `src/app/**` (passos 2 a 4).

**Interfaces:**
- Consumes: os models da Tarefa 2.
- Produces: barrels com os nomes novos. Features importam só delas.

- [ ] **Step 1: Mover os arquivos**

```bash
cd /c/Users/gabri/WorkSpace/my-finance/my-finance-web/src/app
mkdir -p shared/crud/{api,list,table,filter,page}

# services de core e features
git mv core/auth/auth.api.ts core/auth/auth-api.service.ts
git mv core/auth/auth.store.ts core/auth/auth-store.service.ts
git mv core/i18n/transloco-http.loader.ts core/i18n/transloco-loader.service.ts
git mv features/accounts/data/account.api.ts features/accounts/data/account-api.service.ts
git mv features/accounts/data/account.lookup.ts features/accounts/data/account-lookup.service.ts
git mv features/categories/data/category.api.ts features/categories/data/category-api.service.ts
git mv features/categories/data/category.lookup.ts features/categories/data/category-lookup.service.ts
git mv features/transactions/data/transaction.api.ts features/transactions/data/transaction-api.service.ts
git mv features/dashboard/data/dashboard.api.ts features/dashboard/data/dashboard-api.service.ts

# shared/crud -> subpastas
git mv shared/crud/crud-api.ts shared/crud/api/crud-api.service.ts
git mv shared/crud/crud-api.spec.ts shared/crud/api/crud-api.service.spec.ts
git mv shared/crud/lookup.ts shared/crud/api/lookup.service.ts
git mv shared/crud/lookup.spec.ts shared/crud/api/lookup.service.spec.ts
git mv shared/crud/crud-list.ts shared/crud/list/crud-list.ts
git mv shared/crud/crud-list.spec.ts shared/crud/list/crud-list.spec.ts
git mv shared/crud/list-state.ts shared/crud/list/list-state.ts
git mv shared/crud/list-state.spec.ts shared/crud/list/list-state.spec.ts
git mv shared/crud/data-table.component.ts shared/crud/table/data-table.component.ts
git mv shared/crud/data-table.component.html shared/crud/table/data-table.component.html
git mv shared/crud/column.ts shared/crud/table/column.ts
git mv shared/crud/column.spec.ts shared/crud/table/column.spec.ts
git mv shared/crud/cell.directive.ts shared/crud/table/cell.directive.ts
git mv shared/crud/filter-bar.component.ts shared/crud/filter/filter-bar.component.ts
git mv shared/crud/filter-bar.component.html shared/crud/filter/filter-bar.component.html
git mv shared/crud/filter.ts shared/crud/filter/filter.ts
git mv shared/crud/filter.spec.ts shared/crud/filter/filter.spec.ts
git mv shared/crud/crud-page.component.ts shared/crud/page/crud-page.component.ts
git mv shared/crud/crud-actions.ts shared/crud/page/crud-actions.service.ts

# notifier
git mv shared/ui/notifier.ts shared/ui/notifier.service.ts
```

`list-state` é movido para `list/` só para o build continuar passando; ele é removido na Tarefa 4.

- [ ] **Step 2: Renomear as classes**

Rode no `src/app`, depois do passo 1:

```bash
FILES=$(grep -rl --include='*.ts' --include='*.html' . .)
sed -i -E \
  -e 's/\bCrudApi\b/CrudApiService/g' \
  -e 's/\bLookup\b/LookupService/g' \
  -e 's/\bThingApi\b/ThingApiService/g' \
  -e 's/\bAccountApi\b/AccountApiService/g' \
  -e 's/\bAccountLookup\b/AccountLookupService/g' \
  -e 's/\bCategoryApi\b/CategoryApiService/g' \
  -e 's/\bActiveCategoryLookup\b/ActiveCategoryLookupService/g' \
  -e 's/\bAllCategoryLookup\b/AllCategoryLookupService/g' \
  -e 's/\bTransactionApi\b/TransactionApiService/g' \
  -e 's/\bDashboardApi\b/DashboardApiService/g' \
  -e 's/\bAuthApi\b/AuthApiService/g' \
  -e 's/\bAuthStore\b/AuthStoreService/g' \
  -e 's/\bTranslocoHttpLoader\b/TranslocoLoaderService/g' \
  -e 's/\bCrudActions\b/CrudActionsService/g' \
  -e 's/\bNotifier\b/NotifierService/g' \
  $FILES
```

Atenção: `\bLookup\b` só casa a palavra inteira, então `AccountLookup` não é afetado (já tratado pela regra acima).

- [ ] **Step 3: Corrigir os caminhos dos imports**

Mesmo diretório, na ordem:

```bash
FILES=$(grep -rl --include='*.ts' --include='*.html' . .)
sed -i -E \
  -e "s#'@shared/crud/(crud-api|lookup)'#'@shared/crud/api'#g" \
  -e "s#'@shared/crud/crud-list'#'@shared/crud/list'#g" \
  -e "s#'@shared/crud/(data-table\.component|column|cell\.directive)'#'@shared/crud/table'#g" \
  -e "s#'@shared/crud/(filter-bar\.component|filter)'#'@shared/crud/filter'#g" \
  -e "s#'@shared/crud/(crud-page\.component|crud-actions)'#'@shared/crud/page'#g" \
  -e "s#'@shared/data/[a-z-]+'#'@shared/data'#g" \
  -e "s#'@shared/forms/[a-z.-]+'#'@shared/forms'#g" \
  -e "s#'@shared/ui/[a-z./-]+'#'@shared/ui'#g" \
  -e "s#account\.api'#account-api.service'#g" \
  -e "s#account\.lookup'#account-lookup.service'#g" \
  -e "s#category\.api'#category-api.service'#g" \
  -e "s#category\.lookup'#category-lookup.service'#g" \
  -e "s#transaction\.api'#transaction-api.service'#g" \
  -e "s#dashboard\.api'#dashboard-api.service'#g" \
  -e "s#auth\.api'#auth-api.service'#g" \
  -e "s#auth\.store'#auth-store.service'#g" \
  -e "s#transloco-http\.loader'#transloco-loader.service'#g" \
  -e "s#'\./crud-api'#'./crud-api.service'#g" \
  -e "s#'\./lookup'#'./lookup.service'#g" \
  $FILES
```

Os imports relativos entre arquivos de `shared/` não são cobertos por essa regra. Eles são corrigidos no passo 5.

- [ ] **Step 4: Criar as barrels**

`shared/crud/api/index.ts`:

```ts
export { CrudApiService } from './crud-api.service';
export type { ListSource } from './crud-api.service';
export { LookupService } from './lookup.service';
```

`shared/crud/list/index.ts`:

```ts
export { injectCrudList } from './crud-list';
export type { CrudList, CrudListOptions, PagedList } from './crud-list';
```

`shared/crud/table/index.ts`:

```ts
export { CellDirective } from './cell.directive';
export { DataTableComponent } from './data-table.component';
export { ARCHIVE_ACTION, DELETE_ACTION, EDIT_ACTION } from './column';
export type { ColumnDef, ColumnType, RowActionDef, RowActionEvent } from './column';
```

`shared/crud/filter/index.ts`:

```ts
export { FilterBarComponent } from './filter-bar.component';
export type { FilterField, FilterValue, LookupOption } from './filter';
```

`shared/crud/page/index.ts`:

```ts
export { CrudPageComponent } from './crud-page.component';
export { CrudActionsService } from './crud-actions.service';
export type { ConfirmAction } from './crud-actions.service';
```

`shared/data/index.ts`: exporte explicitamente o que as features usam de `page.ts`, `dates.ts`, `api-error.ts`, `http-params.ts` e `http-context.ts`. Para descobrir a lista, rode `grep -rhn "from '@shared/data'" src/app | sort -u` depois do passo 3 e exporte esses nomes (valores com `export`, tipos com `export type`). Padrão de linha:

```ts
export { MAX_PAGE_SIZE, DEFAULT_PAGE_SIZE, samePageRequest } from './page';
export type { PageRequest, PageResponse, SortSpec } from './page';
export { toLocalDate, fromLocalDate } from './dates';
export type { LocalDate, YearMonth } from './dates';
export { ApiError } from './api-error';
export type { FieldError, ProblemDetail } from './api-error';
export { toHttpParams } from './http-params';
export { SKIP_BUSINESS_ERROR_TOAST, skipBusinessErrorToast } from './http-context';
```

Ajuste os nomes à lista real: o compilador acusa qualquer export faltando.

`shared/forms/index.ts`: exporte `FieldComponent` (de `field.component`), `FormFooterComponent` (de `form-footer.component`), `injectFormSubmit` (de `form-submit`), `applyServerErrors` (de `server-errors`) e `ValidationMessage*` (de `validation-message`) — os que as features importam. Use o mesmo método do `shared/data/index.ts` para descobrir a lista.

`shared/ui/index.ts`: exporte `MoneyComponent`, `StatCardComponent`, `EmptyStateComponent`, `ChartComponent` (de `chart/chart.component`), `NotifierService` (de `notifier.service`). Os nomes exatos vêm do `grep` do passo anterior.

- [ ] **Step 5: Corrigir imports relativos dentro de `shared/`**

Dentro de `shared/`, import relativo aponta para o arquivo, nunca para barrel. Depois dos `git mv`, os caminhos de profundidade mudam. Corrija:

- `shared/crud/api/crud-api.service.ts`: `'../data/http-params'` → `'../../data/http-params'`, `'../data/page'` → `'../../data/page'`.
- `shared/crud/api/lookup.service.ts`: `'../data/page'` → `'../../data/page'`.
- `shared/crud/list/crud-list.ts`: `'../data/page'` → `'../../data/page'`; `'./crud-api.service'` → `'../api/crud-api.service'`; `'./filter'` → `'../filter/filter'`.
- `shared/crud/table/data-table.component.ts`: `'../ui/empty-state.component'` → `'../../ui/empty-state.component'`; `'./crud-list'` → `'../list/crud-list'`. `./cell.directive` e `./column` continuam.
- `shared/crud/table/column.ts`: `'../data/page'` → `'../../data/page'`.
- `shared/crud/filter/filter.ts`: `'../data/dates'` → `'../../data/dates'`.
- `shared/crud/page/crud-actions.service.ts`: `'../ui/notifier.service'` → `'../../ui/notifier.service'`.
- Specs (`crud-api.service.spec.ts`, `lookup.service.spec.ts`, `crud-list.spec.ts`, `column.spec.ts`, `filter.spec.ts`): ajuste cada import relativo para o novo local do arquivo.
- `shared/crud/list/list-state.ts` e spec: `'../data/page'` → `'../../data/page'` e `'./filter'` → `'../filter/filter'`.

Depois, rode `npx tsc --noEmit -p tsconfig.app.json` e corrija o que ele apontar.

- [ ] **Step 6: Corrigir os imports que apontam para arquivo renomeado**

Rode `grep -rn "from '\./\|from '\.\./" src/app/core src/app/features` e confira se todo caminho relativo ainda existe. Os casos típicos são `./auth.store`, `./transloco-http.loader` e `./account.api`, que o passo 3 já trocou. Se sobrou algum, ajuste à mão.

- [ ] **Step 7: Verificar**

Run: `npm run lint && npm test && npm run build`
Expected: todos passam.

Run: `grep -rn "crud/crud-api'\|crud/lookup'\|crud/column'\|crud/filter-bar\|crud/crud-page\|crud/crud-actions'\|crud/data-table\|shared/ui/notifier'\|shared/data/page'" src/app`
Expected: nenhuma linha.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "refactor: reorganiza shared/crud em subpastas e renomeia services

Co-Authored-By: Claude Haiku 5.5 <noreply@anthropic.com>"
```

---

## Tarefa 4: Filtro com o formulário como fonte de verdade

**Files:**
- Modify: `src/app/shared/crud/filter/filter-bar.component.ts` (reescrito), `src/app/shared/crud/filter/filter-bar.component.html` (uma troca), `src/app/shared/crud/list/crud-list.ts` (reescrito), `src/app/shared/crud/list/crud-list.spec.ts`, `src/app/features/accounts/list/account-list.page.{ts,html}`, `src/app/features/categories/list/category-list.page.html`, `src/app/features/transactions/list/transaction-list.page.{ts,html}`
- Delete: `src/app/shared/crud/list/list-state.ts`, `src/app/shared/crud/list/list-state.spec.ts`

**Interfaces:**
- Consumes: `filterToForm`, `formToFilter`, `countActiveFilters`, `sameFilter`, `FilterField`, `FilterValue` de `./filter`.
- Produces:
  - `FilterBarComponent<F>`: inputs `fields` (required) e `initial`; output `changed: Partial<F>`.
  - `injectCrudList(api, { sort?, size?, initialFilter? })`: sem `filterFields` e `syncWithUrl`.

- [ ] **Step 1: Escrever o teste de regressão da lógica que sobra**

Adicione em `src/app/shared/crud/filter/filter.spec.ts` (no final do `describe` existente) um caso que cobre o fluxo que o `filter-bar` novo depende, a ida e volta do formulário com o filtro inicial do extrato:

```ts
  it('ida e volta do formulário preserva o período inicial', () => {
    const fields: FilterField[] = [
      { key: 'period', type: 'dateRange', label: 'x', fromKey: 'from', toKey: 'to' },
      { key: 'archived', type: 'boolean', label: 'x' },
    ];
    const initial = { from: '2026-10-01', to: '2026-10-31', archived: false };
    const form = filterToForm(fields, initial);
    expect(formToFilter(fields, form)).toEqual(initial);
  });
```

Se `filter.spec.ts` não importar `FilterField`, `filterToForm` ou `formToFilter`, adicione-os ao import existente.

- [ ] **Step 2: Rodar o teste**

Run: `npx ng test --watch=false --include='**/filter/filter.spec.ts'`
Expected: PASS. Se falhar, a conversão de datas está errada e a refatoração não deve prosseguir antes de corrigir.

- [ ] **Step 3: Reescrever `filter-bar.component.ts`**

Substitua o arquivo inteiro por:

```ts
import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { Button } from 'primeng/button';
import { Checkbox } from 'primeng/checkbox';
import { DatePicker } from 'primeng/datepicker';
import { Drawer } from 'primeng/drawer';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { debounceTime, merge } from 'rxjs';

import type { FilterField, FilterValue, LookupOption } from './filter';
import { countActiveFilters, filterToForm, formToFilter, sameFilter } from './filter';

/**
 * Filtros declarativos. O formulário é a fonte de verdade: cada mudança emite o filtro novo (texto com debounce de 300 ms).
 * "Limpar" volta ao initial. No desktop ficam em linha; abaixo de 1024 px, num drawer com contador de filtros ativos.
 * Os campos (fields) são fixos durante a vida do componente.
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
export class FilterBarComponent<F extends object> implements OnInit {
  readonly fields = input.required<readonly FilterField[]>();
  /** Valor inicial do formulário e do botão "Limpar" (normalmente o initialFilter da lista). */
  readonly initial = input<Partial<F>>({});
  readonly changed = output<Partial<F>>();

  private readonly transloco = inject(TranslocoService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly drawerOpen = signal(false);
  /** Último filtro emitido: evita emitir de novo o que já está na lista. */
  private readonly current = signal<FilterValue>({});
  protected readonly activeCount = computed(() =>
    countActiveFilters(this.fields(), this.current(), this.initial() as FilterValue),
  );
  protected form!: FormGroup;

  ngOnInit(): void {
    const fields = this.fields();
    this.form = new FormGroup(Object.fromEntries(fields.map((f) => [f.key, new FormControl<unknown>(null)])));
    this.form.reset(filterToForm(fields, this.initial() as FilterValue), { emitEvent: false });
    this.current.set(formToFilter(fields, this.form.getRawValue()));

    const textChanges = fields
      .filter((f) => f.type === 'text')
      .map((f) => this.form.controls[f.key].valueChanges.pipe(debounceTime(300)));
    const otherChanges = fields.filter((f) => f.type !== 'text').map((f) => this.form.controls[f.key].valueChanges);
    merge(...textChanges, ...otherChanges)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.emitFilter());
  }

  protected clear(): void {
    // reset sem emitEvent: um único emitFilter no fim evita uma busca por controle.
    this.form.reset(filterToForm(this.fields(), this.initial() as FilterValue), { emitEvent: false });
    this.emitFilter();
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

  /** Emite só se o filtro do formulário for diferente do último emitido. */
  private emitFilter(): void {
    const filter = formToFilter(this.fields(), this.form.getRawValue());
    if (sameFilter(filter, this.current())) return;
    this.current.set(filter);
    this.changed.emit(filter as Partial<F>);
  }
}
```

Por que `current` e não `distinctUntilChanged`: o `clear()` emite fora do fluxo de `valueChanges`. Com `distinctUntilChanged` o último valor visto ficaria defasado, e um debounce pendente do texto dispararia uma busca repetida. Comparar com `current` fecha isso.

- [ ] **Step 4: Trocar `form()` por `form` no template**

Em `filter-bar.component.html`, troque toda ocorrência de `form()` por `form`. Confira com `grep -n "form()" src/app/shared/crud/filter/filter-bar.component.html`: a saída deve ser vazia.

- [ ] **Step 5: Reescrever `crud-list.ts`**

Substitua o arquivo inteiro por:

```ts
import type { Signal } from '@angular/core';
import { computed, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { Subject, catchError, finalize, map, merge, of, switchMap } from 'rxjs';

import type { PageRequest, PageResponse, SortSpec } from '../../data/page';
import { DEFAULT_PAGE_SIZE, samePageRequest } from '../../data/page';
import type { ListSource } from '../api/crud-api.service';

export interface CrudListOptions<F> {
  sort?: SortSpec; // ordenação inicial
  size?: number; // padrão 20
  initialFilter?: Partial<F>; // ex.: { archived: false }
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
 * Estado de uma listagem paginada: filtro, página, ordenação e carregamento. O filtro vem do filter-bar; a lista não
 * lê nem grava a URL. Chamar em inicializador de campo (contexto de injeção): `readonly list = injectCrudList(this.api, {...})`.
 */
export function injectCrudList<T, F extends object>(
  api: ListSource<T, F>,
  options: CrudListOptions<F> = {},
): CrudList<T, F> {
  const initialFilter = options.initialFilter ?? {};
  const defaultSize = options.size ?? DEFAULT_PAGE_SIZE;

  const filter = signal<Partial<F>>({ ...initialFilter });
  const page = signal<PageRequest>({ page: 0, size: defaultSize, sort: options.sort });
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

Observe que o `takeUntilDestroyed()` continua chamado dentro do contexto de injeção, como antes.

- [ ] **Step 6: Ajustar `crud-list.spec.ts`**

Remova os casos que usam `ActivatedRoute`, `Router`, `queryParams`, `filterFields` ou `syncWithUrl`, e o provider de rota que eles montavam. Mantenha os casos de busca inicial, `setFilter` voltando para a página 0, `setPage`, `reload` e erro da API. Se o `beforeEach` montar o provider de rota só para esses casos, remova-o também.

- [ ] **Step 7: Apagar `list-state`**

```bash
git rm -q src/app/shared/crud/list/list-state.ts src/app/shared/crud/list/list-state.spec.ts
```

- [ ] **Step 8: Remover `filterFields` e `[value]` das telas**

Run: `grep -rn "filterFields\|\[value\]=\"list.filter()\"" src/app/features`

Em cada arquivo encontrado:
- `account-list.page.ts` e `transaction-list.page.ts`: apague a linha `filterFields: this.filters,` dentro do `injectCrudList(...)`.
- Os três `*.page.html` (account, category, transaction): apague a linha `[value]="list.filter()"` do `<app-filter-bar>`. Mantenha `[fields]`, `[initial]` e `(changed)`.

Confira que `this.filters` continua sendo usado em `[fields]` (não vira variável morta).

- [ ] **Step 9: Conferir que não sobrou referência**

Run: `grep -rn "list-state\|readListState\|writeListState\|syncWithUrl\|filterFields\|ActivatedRoute\|queryParamMap" src/app`
Expected: nenhuma linha.

- [ ] **Step 10: Verificar**

Run: `npm run lint && npm test && npm run build`
Expected: todos passam.

Se o backend estiver rodando (`npm start` com o proxy), faça o teste manual nas três listas: digitar no texto e ver a busca após 300 ms, mudar um select, mudar o período, "Limpar", e no tamanho de celular o drawer com o contador. Se o backend não estiver de pé, registre no relatório que essa verificação não foi feita.

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "refactor: filtro com o formulário como fonte de verdade, sem URL

Co-Authored-By: Claude Haiku 5.5 <noreply@anthropic.com>"
```

---

## Tarefa 5: Documentação e verificação final

**Files:**
- Modify: `docs/escopo-frontend.md` (de v0.2 para v0.3)

- [ ] **Step 1: Atualizar o cabeçalho e a nota de versão**

No topo, troque `Versão 0.2` por `Versão 0.3`, e acrescente à nota de mudanças: "**Mudanças na v0.3:** API mock removida; models escritos à mão (sem OpenAPI); filtro com o formulário como fonte de verdade, sem URL; `shared/crud` em subpastas; services com sufixo `Service`."

- [ ] **Step 2: Ajustar as seções afetadas**

Conforme o spec, seção 7:
- **§2 Stack:** a linha "Tipos da API" sai da tabela, ou vira "Models escritos à mão".
- **§3.1:** tire `mock/` e `api/` da árvore. Mostre as subpastas de `shared/crud` (`api/`, `list/`, `table/`, `filter/`, `page/`).
- **§3.3 (nomes de arquivos):** acrescente a regra de `.service.ts` / `Service`.
- **§4.1 (contratos da API):** troque a referência ao OpenAPI por models à mão.
- **§4.3 (`injectCrudList`):** tire a sincronização com a URL.
- **§4.5 (`filter-bar`):** troque a descrição pelo fluxo novo (formulário → `changed`; "Limpar" → reset).
- **§5.4 (tipos gerados do OpenAPI):** substitua por uma seção curta "Models escritos à mão" com a regra de nulidade (`T | null` nos campos que podem vir nulos).
- **§13 (ambiente):** tire a configuração `mock` e o `start:mock`.
- **§14 (roadmap) e §11 (telas por fase):** na fase 0b, tire "API mock".
- **§15 (decisões):** registre a remoção do mock, do OpenAPI e do filtro na URL.

Não mexa em §7 (Transloco) nem no drawer de filtros, porque ambos continuam como estão.

- [ ] **Step 3: Verificação final**

Run:
```bash
npm run lint && npm test && npm run build
grep -rn "@api/\|mock\|api:types\|openapi\|start:mock\|list-state\|syncWithUrl\|filterFields" src angular.json package.json tsconfig.json README.md
```
Expected: lint, testes e build passam. O `grep` não deve achar nada além de `vi.fn`/`mockReturnValue` e `mockSystemDark` nos specs, que são de teste e ficam.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "docs: atualiza o escopo do frontend para a v0.3

Co-Authored-By: Claude Haiku 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 5: Relatório**

Informe, com a saída real dos comandos:
- o resultado de lint, testes e build;
- se o teste manual do filtro foi feito (com backend) ou não;
- o total de linhas removidas e o total de arquivos do `shared/crud` antes e depois (`git diff --stat` a partir do commit `baef42a`).

---

## Self-Review

**Cobertura do spec:**
- §3.1 API mock → Tarefa 1.
- §3.2 OpenAPI e models → Tarefa 2.
- §4 filtro e `crud-list` → Tarefa 4.
- §5 pastas e barrels → Tarefa 3, passos 1 a 5.
- §6 nomenclatura de services → Tarefa 3, passos 1 a 3.
- §7 documentação → Tarefa 5.
- §8 verificação → Tarefa 5, passo 3, e o passo de build de cada tarefa.
- §9 ordem → as cinco tarefas seguem a ordem do spec, com renomes e reorganização juntos na Tarefa 3.

**Varredura de placeholders:** os pontos em que o passo manda descobrir a lista de exports (barrels de `shared/data`, `shared/forms`, `shared/ui`) dão o comando exato e o formato da linha. Os demais trechos têm código ou comando completo.

**Consistência de tipos:** `FilterBarComponent` recebe `initial` (não `value`) em todas as telas (Tarefa 4, passo 8). `injectCrudList` perde `filterFields` e `syncWithUrl` na mesma tarefa em que as telas param de passá-los. `CrudActionsService`, `NotifierService`, `AuthStoreService` e os demais nomes da Tarefa 3 batem com os da tabela do spec §6.

**Risco conhecido:** a Tarefa 3 é a mais sujeita a erro de import relativo. O passo 5 lista os casos conhecidos, e o `tsc` pega o resto. Se a quantidade de correções for grande, vale dividir a Tarefa 3 em um commit para o renome de classes e outro para a movimentação de pastas, mantendo o build verde em cada um.
