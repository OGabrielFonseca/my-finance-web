# Simplificação do protótipo: design

> 12/10/2026 · Referência: `docs/escopo-frontend.md` v0.2 (seções citadas como "escopo §N") e
> `2026-10-12-fundacao-e-prototipo-design.md`.

## 1. Objetivo

O protótipo das fases 0a/0b ficou pesado para um app pessoal com 4 telas: cerca de 31% do código de produção é a API mock,
os tipos passam por um `schema.d.ts` simulado mais uma camada de tipos genéricos, o filtro sincroniza estado em dois
sentidos (formulário ⇄ lista ⇄ URL) e `shared/crud` tem 18 arquivos numa pasta só.

Esta refatoração reduz indireção **sem mudar o comportamento das telas**, com uma exceção deliberada: o filtro deixa de
ficar na URL (seção 4).

## 2. Escopo

**Dentro:**

| Item | Seção |
|---|---|
| Remover a API mock e tudo que só existe por causa dela | 3.1 |
| Remover o OpenAPI e escrever os models à mão | 3.2 |
| Refatorar `filter-bar` e `crud-list` (formulário como fonte de verdade, sem URL) | 4 |
| Reorganizar `shared/` em subpastas com barrels | 5 |
| Sufixo `.service` / `Service` em toda classe `@Injectable` e nas bases abstratas | 6 |
| Atualizar `docs/escopo-frontend.md` | 7 |

**Fora:**

- **Transloco:** permanece como está.
- **Drawer de filtros no celular:** permanece, com o contador de filtros ativos.
- **`features/` e `core/`:** a estrutura de pastas não muda. Só os arquivos de service são renomeados (seção 6) e os
  models reescritos (seção 3.2).
- **Lacunas da API:** o `AllCategoryLookupService`, que deduz as categorias de sistema porque o `CategorySummary` não traz
  `system`, e a chamada `/balance` por linha na lista de contas. Os dois dependem de mudanças no backend.

## 3. Remoções

### 3.1 API mock

| Remover | Detalhe |
|---|---|
| `src/app/mock/` | Inteiro, incluindo os specs e os seeds |
| `src/environments/environment.mock.ts` | |
| `environment.ts` | Campos `useMockApi` e `mockInterceptors`. Fica só `apiUrl` |
| `app.config.ts` | O `...environment.mockInterceptors` em `withInterceptors` |
| `angular.json` | Configurações `mock` de `build` e `serve` (incluindo o `fileReplacements`) |
| `package.json` | Script `start:mock` |
| `core/layout/user-menu.component.ts` | Item "Expirar sessão" e a chamada a `/__mock/expire-session` |
| `features/auth/login.page.html` | O `p-message` com `auth.mockHint` e a chave no `public/i18n/auth/pt-BR.json` |
| `README.md` | Menções a `start:mock`, se houver |

Depois disso, o front roda só com `npm start`, contra a `my-finance-api` via `proxy.conf.json`.

### 3.2 OpenAPI → models escritos à mão

**Remover:** `src/api/` (`schema.d.ts`, `api-types.ts` e `api-types.spec.ts`), o alias `@api/*` do `tsconfig.json`, o
script `api:types` e a devDependency `openapi-typescript`.

**Models:** cada `*.model.ts` declara `interface`s simples. As regras são:

- **Respostas:** todo campo é obrigatório. Os que podem vir `null` usam `T | null`, com a mesma nulidade que hoje está nas
  listas `N` do `ApiResponse<K, N>`.
- **Requests:** os campos opcionais usam `?`, como no `schema.d.ts` atual.
- **Enums:** uma única fonte. A constante gera o tipo e substitui o `satisfies`:

  ```ts
  export const ACCOUNT_TYPES = ['CHECKING', 'SAVINGS', 'WALLET', 'INVESTMENT', 'OTHER'] as const;
  export type AccountType = (typeof ACCOUNT_TYPES)[number];
  ```

- **Tipos de data:** `date` usa `LocalDate` e `month` usa `YearMonth`, de `shared/data`. Instantes (`createdAt`,
  `updatedAt`) continuam `string`.
- **Objetos aninhados:** `Transaction.account`, `destinationAccount` e `category` referenciam `AccountSummary` e
  `CategorySummary` diretamente, sem `Omit`.

| Arquivo | Tipos |
|---|---|
| `core/auth/auth.model.ts` | `LoginRequest`, `RegisterRequest`, `TokenResponse`, `User` (+ `StoredSession`, que já existe) |
| `features/accounts/data/account.model.ts` | `Account`, `AccountSummary`, `AccountBalance`, `CreateAccountRequest`, `UpdateAccountRequest`, `AccountType` |
| `features/categories/data/category.model.ts` | `Category`, `CategorySummary`, `CreateCategoryRequest`, `UpdateCategoryRequest`, `CategoryType` |
| `features/transactions/data/transaction.model.ts` | `Transaction`, `CreateTransactionRequest`, `UpdateTransactionRequest`, `CreateTransferRequest`, `TransactionType`, `TransactionStatus` |
| `features/dashboard/data/dashboard.model.ts` | `DashboardSummary`, `CategoryExpense`, `ExpensesByCategory` |

Os campos de cada tipo são os do `schema.d.ts` atual. Ele é a referência, e deve ser lido antes de ser apagado.

## 4. Filtro

### 4.1 Fluxo novo

```
FormGroup ──valueChanges──► formToFilter ──► (changed) ──► crud-list.setFilter
"Limpar"  = form.reset(filterToForm(initial))   → emite pelo próprio valueChanges
```

O `filter-bar` é o dono do estado do formulário. A lista só recebe filtros. Não há mais caminho de volta
(lista → formulário).

### 4.2 `<app-filter-bar>`

| Antes | Depois |
|---|---|
| Inputs `fields`, `value`, `initial` | Inputs `fields`, `initial`. O `value` sai |
| `FormGroup` criado em `computed` | Criado uma única vez no `ngOnInit`, com `filterToForm(fields, initial)` |
| `effect` 1: assina `valueChanges` | Uma assinatura no `ngOnInit`, com `takeUntilDestroyed(destroyRef)`. Texto com `debounceTime(300)`, os demais imediatos. `map(formToFilter)` → `distinctUntilChanged(sameFilter)` → `changed.emit` |
| `effect` 2: valor externo → `form.reset` | Removido |
| `clear()` emite `initial` | `clear()` faz `form.reset(filterToForm(fields, initial))` e fecha o drawer. A emissão sai do `valueChanges` |
| `activeCount` a partir do input `value` | `activeCount` a partir de um signal interno `current`, iniciado com `initial` e atualizado a cada emissão |

O template, o drawer e o `ngTemplateOutlet` não mudam, exceto o `form()`, que vira `form` (deixa de ser signal).

### 4.3 `filter.ts`

Ficam `fieldKeys`, `filterToForm`, `formToFilter`, `countActiveFilters` e `sameFilter`. O `filterToForm` continua
necessário para o valor inicial e para o "Limpar", porque o período inicial (mês corrente) precisa virar `Date[]`.

### 4.4 `injectCrudList`

- **Sai:** a injeção de `Router` e `ActivatedRoute`, o `readListState`, o `effect` que chama `router.navigate`, e as
  opções `filterFields` e `syncWithUrl`.
- **Estado inicial:** o filtro começa em `initialFilter` e a página em `{ page: 0, size, sort }`.
- **`list-state.ts` e `list-state.spec.ts`:** removidos.
- **`crud-list.spec.ts`:** saem os casos de URL. Ficam os de busca, filtro, paginação, recarga e erro.

### 4.5 Telas

- `account-list.page.html`, `category-list.page.html` e `transaction-list.page.html`: sai o `[value]="list.filter()"`
  do `<app-filter-bar>`.
- `account-list.page.ts` e `transaction-list.page.ts`: sai o `filterFields` do `injectCrudList`.

**Mudança de comportamento:** um F5 ou link compartilhado volta para o filtro e a página padrão.

## 5. Estrutura de `shared/`

```
shared/
├── crud/
│   ├── api/      crud-api.service.ts (+spec), lookup.service.ts (+spec), index.ts
│   ├── list/     crud-list.ts (+spec), index.ts
│   ├── table/    data-table.component.ts|html, column.ts (+spec), cell.directive.ts, index.ts
│   ├── filter/   filter-bar.component.ts|html, filter.ts (+spec), index.ts
│   └── page/     crud-page.component.ts, crud-actions.service.ts, index.ts
├── data/         api-error, dates, page, http-params, http-context (+specs), index.ts
├── forms/        field.component, form-footer.component, form-submit, server-errors,
│                 validation-message (+specs), index.ts
└── ui/           chart/ (chart.component, echarts), empty-state.component, money.component,
                  notifier.service, stat-card.component, index.ts
```

Regras:

- **`index.ts`:** cada pasta folha exporta a sua API pública (`export { X } from './x'`; `export type` para tipos).
- **Features:** importam só pelas barrels, por exemplo `@shared/crud/table`, `@shared/forms` e `@shared/data`.
- **Dentro de `shared/`:** os imports são relativos e apontam para o arquivo, nunca para uma barrel, para não criar ciclos.
- **`ui/chart/`:** tem barrel própria (`@shared/ui/chart`), fora do `ui/index.ts`, para o ECharts não entrar no bundle inicial (o `ui/index.ts` é importado por `core/`).

## 6. Nomenclatura de services

Toda classe `@Injectable`, mais as duas bases abstratas, usa o arquivo `<nome>.service.ts` e a classe `<Nome>Service`:

| Antes | Depois |
|---|---|
| `core/auth/auth.api.ts` · `AuthApi` | `core/auth/auth-api.service.ts` · `AuthApiService` |
| `core/auth/auth.store.ts` · `AuthStore` | `core/auth/auth-store.service.ts` · `AuthStoreService` |
| `core/i18n/transloco-http.loader.ts` · `TranslocoHttpLoader` | `core/i18n/transloco-loader.service.ts` · `TranslocoLoaderService` |
| `core/theme/theme.service.ts` · `ThemeService` | sem mudança |
| `features/accounts/data/account.api.ts` · `AccountApi` | `account-api.service.ts` · `AccountApiService` |
| `features/accounts/data/account.lookup.ts` · `AccountLookup` | `account-lookup.service.ts` · `AccountLookupService` |
| `features/categories/data/category.api.ts` · `CategoryApi` | `category-api.service.ts` · `CategoryApiService` |
| `features/categories/data/category.lookup.ts` · `ActiveCategoryLookup`, `AllCategoryLookup` | `category-lookup.service.ts` · `ActiveCategoryLookupService`, `AllCategoryLookupService` |
| `features/transactions/data/transaction.api.ts` · `TransactionApi` | `transaction-api.service.ts` · `TransactionApiService` |
| `features/dashboard/data/dashboard.api.ts` · `DashboardApi` | `dashboard-api.service.ts` · `DashboardApiService` |
| `shared/crud/crud-api.ts` · `CrudApi` (abstrata) | `shared/crud/api/crud-api.service.ts` · `CrudApiService` |
| `shared/crud/lookup.ts` · `Lookup` | `shared/crud/api/lookup.service.ts` · `LookupService` |
| `shared/crud/crud-actions.ts` · `CrudActions` | `shared/crud/page/crud-actions.service.ts` · `CrudActionsService` |
| `shared/ui/notifier.ts` · `Notifier` | `shared/ui/notifier.service.ts` · `NotifierService` |

Regras complementares:

- **Specs:** acompanham o arquivo (`*.service.spec.ts`).
- **Classes de teste:** a classe de teste em `crud-api.service.spec.ts` vira `ThingApiService`.
- **Barrels das features** (`features/*/index.ts`): exportam os nomes novos.
- **Fora da regra:** funções, constantes, guards, interceptors, providers e `auth-storage.ts`, porque não são classes
  injetáveis.

## 7. Documentação

Atualizar o `docs/escopo-frontend.md` para v0.3, com uma nota de mudanças no topo:

- **§2 Stack:** tirar a linha "Tipos da API", ou trocá-la por "models escritos à mão".
- **§3.1:** tirar `mock/` e `api/` da árvore e mostrar as subpastas de `shared/crud`.
- **§3.3:** sufixo `.service`.
- **§4.1:** models à mão.
- **§4.3:** sem URL.
- **§4.5:** fluxo novo do filtro.
- **§5.4:** remover ou substituir.
- **§13:** sem mock.
- **§14 roadmap:** a fase 0b deixa de ter mock.
- **§15:** decisões.

Os specs e planos anteriores ficam como histórico e não são editados.

## 8. Verificação

- **Comandos:** `npm run lint`, `npm test` e `npm run build`, todos sem erros.
- **Busca por resquícios:** `grep` sem resultados para `@api/`, `mock` (fora de `vi.fn`/`mockReturnValue` dos testes),
  `list-state`, `syncWithUrl` e `filterFields`.
- **Teste manual:** se o backend estiver rodando, teste do filtro nas três listas: digitar, mudar o select, mudar o
  período, "Limpar" e o drawer no celular. Se não estiver, a verificação fica só em lint, testes e build, e o relatório
  final diz isso explicitamente.

## 9. Ordem sugerida

Cada passo deixa o projeto compilando e com os testes passando, em um commit por passo:

1. Remover o mock.
2. Models à mão e remoção do OpenAPI.
3. Renomear os services (seção 6) e reorganizar o `shared/` com as barrels (seção 5). Os dois movem os mesmos arquivos,
   então vão juntos.
4. Refatorar o filtro e o `crud-list` (seção 4).
5. Atualizar a documentação.
