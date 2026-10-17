# MyFinance — Escopo inicial do Frontend (my-finance-web)

> Versão 0.4 · 15/10/2026 · Documento vivo: atualizar conforme as decisões evoluírem.
>
> **Mudanças na v0.4:** login com conta Google (botão oficial do GIS, `POST /auth/google`); ver
> `docs/superpowers/specs/2026-10-15-login-google-design.md`.
>
> **Mudanças na v0.3:** API mock removida; models escritos à mão (sem OpenAPI); filtro com o formulário como fonte de verdade,
> sem URL; `shared/crud` em subpastas; services com sufixo `Service`.
>
> **Mudanças na v0.2** (revisão contra o código do backend): rotas aninhadas de faturas e compras; lookups pelos endpoints
> `/options` com `LookupService`; categoria sem `GET /{id}` (o formulário recebe a linha); `month` do orçamento é `LocalDate`;
> requests distintos de criação e edição; saldo por conta via `/balance` (atual e projetado); ação de efetivar lançamento;
> estado vazio sem categorias; CORS movido para "em aberto"; nova fase **0b. Protótipo com API mock**; lista de pedidos ao backend
> (seção 15).
>
> **Decisões fechadas na v0.1:** **Angular 21** (standalone, signals, zoneless) + **PrimeNG 21** (MIT) com preset **Noir sobre surface
> `slate`** e modo escuro; **ngx-echarts** para gráficos; **textos em português direto no código** (um único idioma, sem biblioteca de i18n
> para outros idiomas); **lint** com angular-eslint + typescript-eslint + Prettier; **componentes e services genéricos de CRUD**
> (listagem paginada com filtro, formulário em diálogo, arquivar/excluir). Contratos seguem o `escopo-backend.md` (v0.5).
> Princípio geral, o mesmo do backend: **evitar over-engineering**.

## 1. Objetivo

SPA que consome a `my-finance-api` (`/api/v1`) para gerenciar finanças pessoais e investimentos: contas, categorias, lançamentos e
transferências, cartões e faturas, orçamentos, carteira de investimentos e dashboard mensal.

A maior parte das telas é **CRUD com listagem filtrada e paginada**. Por isso o centro deste escopo é a camada reutilizável
(seção 4): uma tela de cadastro nova deve ser, na maior parte, **declaração** (colunas, filtros e campos do formulário),
não código repetido.

## 2. Stack

| Camada | Escolha | Observação |
|---|---|---|
| Framework | **Angular 21** | Standalone (sem `NgModule`), signals, **zoneless** (padrão no 21), novo control flow (`@if`, `@for`) |
| UI | **PrimeNG 21.x** + **PrimeIcons** | **Fixar na linha 21** (MIT). A partir do PrimeNG 22 a licença mudou (ver seção 10) |
| Tema | **`@primeuix/themes`** (preset Aura customizado: Noir + surface `slate`) | Design tokens, modo escuro por classe `.app-dark`; ver seção 6 |
| Layout/utilitários CSS | **Tailwind CSS v4** + **`tailwindcss-primeui`** | Só para layout e espaçamento (grid, flex, gap). Cor e componentes vêm do PrimeNG. Substitui o antigo PrimeFlex |
| Gráficos | **ngx-echarts 21.x** + **echarts** (import modular, tree-shaking) | A versão do ngx-echarts acompanha a do Angular (21 ↔ 21) |
| Login social | **Script do Google Identity Services** (`accounts.google.com/gsi/client`), carregado sob demanda, **sem pacote npm** | Só `core/auth/google-identity.service.ts` toca `window.google`; tipos escritos à mão |
| Integração bancária | **pluggy-connect-sdk** (versão exata, carregada sob demanda) | Widget oficial da Pluggy; só `features/integrations/data/pluggy-connect.service.ts` importa o SDK |
| Formulários | **Reactive Forms tipados** | Signal Forms ainda é experimental no 21: não usar por enquanto |
| HTTP | `HttpClient` (`withFetch`) + interceptors funcionais | |
| Estado | **Signals** (`signal`, `computed`, `linkedSignal`) | Sem NgRx/biblioteca de estado: o estado é local à tela ou em stores simples |
| Textos | **Português direto no código** (sem biblioteca de i18n) | Um único idioma; ver seção 7 |
| Models da API | **Escritos à mão** | Interfaces e listas de enums em `*.model.ts`, espelhando os DTOs do backend; sem geração de código (seção 5.4) |
| Lint/format | **angular-eslint** + **typescript-eslint** + **Prettier** + Husky/lint-staged | Ver seção 8 |
| Testes | **Vitest** (runner padrão do Angular 21) | **Só testes unitários da lógica reutilizável**, no mesmo espírito do backend; ver seção 9 |
| Locale | `pt-BR`, moeda `BRL` | `LOCALE_ID`, `DEFAULT_CURRENCY_CODE`, tradução dos componentes do PrimeNG via `primelocale` |

## 3. Arquitetura e organização

### 3.1 Estrutura de pastas: espelha os módulos do backend

```
src/
├── app/
│   ├── core/                        # singleton, carregado uma vez
│   │   ├── auth/                    # AuthStoreService, authGuard, guestGuard, authInterceptor, token storage, google-identity.service (GIS)
│   │   ├── http/                    # errorInterceptor, languageInterceptor, ApiError
│   │   ├── i18n/                    # locale do app e configuração do PrimeNG
│   │   ├── theme/                   # preset do PrimeNG, ThemeService (claro/escuro/sistema)
│   │   └── layout/                  # ShellComponent (topbar + menu lateral), páginas de erro
│   ├── shared/                      # reutilizável, sem regra de negócio
│   │   ├── crud/
│   │   │   ├── api/                 # CrudApiService, LookupService
│   │   │   ├── list/                # injectCrudList (estado da listagem)
│   │   │   ├── table/               # DataTable, ColumnDef, appCell
│   │   │   ├── filter/              # FilterBar, FilterField
│   │   │   └── page/                # CrudPage, CrudActionsService
│   │   ├── data/                    # PageResponse, PageRequest, toHttpParams, datas (LocalDate/YearMonth)
│   │   ├── forms/                   # FieldComponent, applyServerErrors, validadores
│   │   ├── ui/                      # MoneyComponent (+/-), StatCard, EmptyState, ChartComponent
│   │   └── pipes/                   # money, localDate, yearMonth, enumLabel
│   ├── features/                    # um diretório por módulo do backend
│   │   ├── auth/                    # login, cadastro, google-sign-in.component (botão do Google)
│   │   ├── profile/                 # /me
│   │   ├── dashboard/
│   │   ├── accounts/
│   │   ├── categories/
│   │   ├── transactions/
│   │   ├── credit-cards/            # cartões, faturas, compras
│   │   ├── budgets/
│   │   ├── investments/             # ativos, operações, proventos, carteira
│   │   ├── integrations/            # credenciais da Pluggy, bancos conectados, sincronização, contas do banco e histórico
│   │   └── imports/                 # fila de revisão das transações trazidas dos bancos (aprovar, ignorar, categoria)
│   ├── app.config.ts
│   └── app.routes.ts
└── styles.css
public/
```

Estrutura de uma feature (exemplo: `accounts`):

```
features/accounts/
├── index.ts                         # API pública da feature (o que outras features podem importar)
├── accounts.routes.ts               # rotas lazy
├── data/
│   ├── account.model.ts             # interfaces escritas à mão + listas de enums
│   └── account-api.service.ts       # AccountApiService extends CrudApiService
├── list/
│   └── account-list.page.ts         # listagem: colunas + filtros declarados
├── form/
│   └── account-form.component.ts    # formulário aberto em diálogo
└── components/                      # só se a feature tiver componentes próprios (ex.: AccountSelect)
    └── account-select.component.ts
```

### 3.2 Regras do padrão

- **Tudo standalone, `ChangeDetectionStrategy.OnPush`, `inject()`** em vez de construtor, `input()`/`output()`/`model()` em vez de
  decorators, control flow novo (`@if`/`@for`). Sem `NgModule`.
- **Uma rota lazy por feature** (`loadChildren: () => import('./features/accounts/accounts.routes')`).
- **Feature não importa arquivo interno de outra feature.** Só o que estiver no `index.ts` dela (ex.: `AccountApiService`, `AccountSelect`,
  tipos). É o equivalente ao "service público do módulo" do backend, e o lint quebra se alguém fizer import profundo (seção 8).
- **`shared/` não conhece features.** `core/` não conhece features, exceto `app.routes.ts` e o menu.
- **Componentes de página** (`*.page.ts`) montam a tela e chamam services; **componentes de UI** em `shared/ui` só recebem `input()`
  e emitem `output()`, sem acessar HTTP.
- **Textos visíveis em português** no template ou no TS (seção 7). Exceções: dados vindos da API
  (nomes cadastrados pelo usuário, `detail` dos erros).
- **Nada de cálculo financeiro no front.** Saldos, totais de fatura, posição e preço médio vêm prontos da API (são derivados no
  backend). O front só formata e soma para exibição quando a própria API não entrega o total.

### 3.3 Nomes de arquivos

| Sufixo | Conteúdo |
|---|---|
| `*.page.ts` | Componente roteado (uma tela) |
| `*.component.ts` | Componente reutilizável ou parte de tela |
| `*.service.ts` | Classe `@Injectable` (service HTTP de um recurso, `LookupService`, `AuthStoreService`, bases abstratas): arquivo `<nome>.service.ts`, classe `<Nome>Service` (ex.: `account-api.service.ts` → `AccountApiService`) |
| `*.model.ts` | Tipos e constantes (enums) |
| `*.routes.ts` | Rotas da feature |
| `*.spec.ts` | Teste unitário (Vitest) |

Templates e estilos inline nos componentes pequenos; arquivo `.html` separado quando o template passar de ~40 linhas.

## 4. Camada reutilizável de CRUD

Peças, de baixo para cima:

```
CrudApiService (HTTP)  →  injectCrudList (estado da listagem)  →  <app-filter-bar> + <app-data-table>  →  <app-crud-page>
                                                          CrudActionsService (diálogo de formulário, confirmação, toast)
```

### 4.1 Contratos da API no front

Models escritos à mão (sem OpenAPI), espelhando o `PageResponse` e o `ProblemDetail` do backend (escopo-backend, seções 3.4 e 3.8):

```ts
// shared/data/page.ts
export interface PageResponse<T> {
  items: T[];
  page: number;        // começa em 0
  size: number;
  totalItems: number;
  totalPages: number;
}

export interface SortSpec {
  field: string;       // nome do atributo da ENTIDADE no backend (ex.: 'transactionDate')
  direction: 'asc' | 'desc';
}

export interface PageRequest {
  page: number;
  size: number;        // padrão 20, máximo 100 (limite da API)
  sort?: SortSpec;
}
```

```ts
// shared/data/http-params.ts: filtro → query params, ignorando vazios (mesma ideia do Specs do backend)
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

**Datas (atenção):** o backend usa `LocalDate` (`2026-10-12`) e `YearMonth` (`2026-10`), sem fuso.
**Nunca usar `toISOString()`** para enviar data: ele converte para UTC e, em `America/Sao_Paulo`, um lançamento feito depois das
21h vira o dia seguinte. Os helpers abaixo são a única forma de converter:

```ts
// shared/data/dates.ts
export type LocalDate = string;   // 'YYYY-MM-DD'
export type YearMonth = string;   // 'YYYY-MM'

export function toLocalDate(d: Date): LocalDate {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
export function fromLocalDate(s: LocalDate): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);          // meia-noite local, sem fuso
}
export function toYearMonth(d: Date): YearMonth {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}
```

- **Modelos** guardam datas como `LocalDate`/`YearMonth` (string, igual ao JSON). **Formulários** usam `Date` (exigência do
  `p-datepicker`). A conversão acontece só na borda do formulário.
- **Dinheiro:** chega como `number` (o Jackson serializa `BigDecimal` como número). É suficiente para exibir e editar valores com
  2 casas. Valores sempre positivos; o sinal visual vem do `type` (receita/despesa), como no backend.
- **Moeda:** tudo BRL (`currency` existe, mas é ignorada na exibição por enquanto).

### 4.2 `CrudApiService`: service HTTP genérico

```ts
// shared/crud/api/crud-api.service.ts
export abstract class CrudApiService<T extends { id: string }, TCreate, TUpdate = TCreate, TFilter extends object = object> {
  protected readonly http = inject(HttpClient);
  protected abstract readonly path: string;            // ex.: '/accounts'

  protected get url(): string {
    return `${environment.apiUrl}${this.path}`;         // apiUrl = '/api/v1'
  }

  list(filter: Partial<TFilter>, page: PageRequest): Observable<PageResponse<T>> {
    return this.http.get<PageResponse<T>>(this.url, { params: toHttpParams(filter, page) });
  }
  get(id: string): Observable<T> {
    return this.http.get<T>(`${this.url}/${id}`);
  }
  create(body: TCreate): Observable<T> {
    return this.http.post<T>(this.url, body);
  }
  update(id: string, body: TUpdate): Observable<T> {
    return this.http.put<T>(`${this.url}/${id}`, body);
  }
  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
  archive(id: string): Observable<void> {                // PATCH /{id}/archive → 204, sem corpo
    return this.http.patch<void>(`${this.url}/${id}/archive`, null);
  }
}
```

```ts
// features/accounts/data/account-api.service.ts: só declara o que for específico
@Injectable({ providedIn: 'root' })
export class AccountApiService extends CrudApiService<Account, CreateAccountRequest, UpdateAccountRequest, AccountFilter> {
  protected readonly path = '/accounts';

  balance(id: string): Observable<AccountBalance> {
    return this.http.get<AccountBalance>(`${this.url}/${id}/balance`);
  }
}
```

- Nem todo recurso tem todas as operações (categorias não têm `DELETE`, lançamentos não têm `archive`). A base expõe todas, e
  **a tela declara quais ações mostra** (`actions` da tabela, seção 4.4). Separar em interfaces por operação seria abstração sem ganho.
- Recursos que fogem do CRUD (faturas, pagamento, compras parceladas, posição, carteira, dashboard) ganham **métodos próprios** no
  `*-api.service.ts` da feature ou um service simples sem herdar `CrudApiService`.
- **Recursos aninhados** (faturas e compras ficam sob o cartão: `/credit-cards/{cardId}/invoices/{invoiceId}`) não herdam
  `CrudApiService`: o service recebe o `cardId` em cada método (`invoices(cardId, page)`, `close(cardId, invoiceId)`...).
- **Criação e edição podem ter corpos diferentes** (ex.: `CreateAccountRequest` × `UpdateAccountRequest`, `UpdateCategoryRequest`
  sem `type`/`parentId`, `UpdateTransactionRequest` sem `type`). Por isso `CrudApiService` tem `TCreate` e `TUpdate` separados.
- **Nem todo recurso tem `GET /{id}`** (categorias não têm). Nesses casos o formulário de edição recebe a linha da tabela pelo
  `DynamicDialogConfig.data` em vez de buscar pelo id.

### 4.3 `injectCrudList`: estado da listagem

Função de injeção (no lugar de classe base) que concentra o estado de uma listagem: filtro, página, ordenação, carregamento
sem sincronização com a URL.

```ts
// shared/crud/list/crud-list.ts (resumo)
export interface CrudListOptions<F> {
  sort?: SortSpec;                   // ordenação inicial
  size?: number;                     // padrão 20
  initialFilter?: Partial<F>;        // ex.: { archived: false }
}

export function injectCrudList<T extends { id: string }, F extends object>(
  api: ListSource<T, F>,
  options: CrudListOptions<F> = {},
) {
  const filter = signal<Partial<F>>(options.initialFilter ?? {});
  const page = signal<PageRequest>({ page: 0, size: options.size ?? 20, sort: options.sort });
  const data = signal<PageResponse<T> | null>(null);
  const loading = signal(false);
  const reload$ = new Subject<void>();

  // filtro ou página mudou (ou reload) → nova busca; switchMap cancela a anterior
  merge(toObservable(computed(() => ({ filter: filter(), page: page() }))), reload$.pipe(map(() => ({ filter: filter(), page: page() }))))
    .pipe(
      tap(() => loading.set(true)),
      switchMap(q => api.list(q.filter, q.page).pipe(catchError(() => of(null)), finalize(() => loading.set(false)))),
      takeUntilDestroyed(),
    )
    .subscribe(result => result && data.set(result));

  return {
    filter: filter.asReadonly(),
    page: page.asReadonly(),
    loading: loading.asReadonly(),
    items: computed(() => data()?.items ?? []),
    totalItems: computed(() => data()?.totalItems ?? 0),
    setFilter: (f: Partial<F>) => { filter.set(f); page.update(p => ({ ...p, page: 0 })); },   // filtro novo volta à página 0
    setPage: (p: Partial<PageRequest>) => page.update(cur => ({ ...cur, ...p })),
    reload: () => reload$.next(),
  };
}
export type CrudList<T extends { id: string }, F extends object> = ReturnType<typeof injectCrudList<T, F>>;
```

- **Filtro fora da URL:** o filtro vive só no signal da lista e no formulário do `<app-filter-bar>`. Recarregar a página volta ao
  `initialFilter`; a navegação não grava nem lê query params.
- **Erro na busca:** o `errorInterceptor` já mostra o toast (seção 5.2). A lista mantém os dados anteriores.
- Por que função e não classe base: chamada em inicializador de campo (`readonly list = injectCrudList(...)`), roda no contexto de
  injeção, não depende de herança, e cada tela pode ter mais de uma lista.
- `rxResource`/`httpResource` podem substituir o miolo quando estiverem estáveis. A API pública (`items`, `setFilter`...) não muda.

### 4.4 `<app-data-table>`: tabela declarativa sobre `p-table`

Tabela em modo **lazy** (paginação e ordenação no servidor). As colunas são declaradas e a formatação por tipo é automática:

```ts
// shared/crud/table/column.ts
export interface ColumnDef<T> {
  field: keyof T & string;
  header: string;                      // chave i18n
  type?: 'text' | 'money' | 'date' | 'month' | 'enum' | 'boolean' | 'tag' | 'color';
  enumKey?: string;                    // ex.: 'accountType' → enums.accountType.CHECKING
  sortField?: string | false;          // atributo da ENTIDADE para ?sort= (padrão: field; false = não ordena)
  width?: string;
  align?: 'left' | 'right' | 'center'; // money é 'right' por padrão
}

export type RowAction = 'edit' | 'archive' | 'delete';
```

```html
<!-- uso -->
<app-data-table [columns]="columns" [list]="list" [actions]="['edit', 'archive']"
                (edit)="openForm($event)" (archive)="archive($event)">
  <!-- célula customizada, quando o tipo padrão não basta -->
  <ng-template appCell="name" let-row>
    <i [class]="row.icon" [style.color]="row.color"></i> {{ row.name }}
  </ng-template>
</app-data-table>
```

- Converte o `onLazyLoad` do PrimeNG (`first`, `rows`, `sortField`, `sortOrder`) em `PageRequest` e chama `list.setPage(...)`.
- **`sortField` existe porque o nome no DTO pode diferir do atributo da entidade.** Exemplo real: `TransactionResponse.date`
  vem de `Transaction.transactionDate`; a coluna declara `sortField: 'transactionDate'`. Mandar `?sort=date` gera 400
  `MALFORMED_REQUEST`.
- Estados: carregando (skeleton), vazio (`<app-empty-state>` com ação "Novo") e paginação (`rowsPerPageOptions` 10/20/50/100).
- Registros arquivados aparecem esmaecidos, com tag "Arquivado".
- Ações por linha num menu (`p-menu` popup) para não poluir a tabela; em telas com uma só ação, botão direto.

### 4.5 `<app-filter-bar>`: filtros declarativos

```ts
// shared/crud/filter/filter.ts
export type FilterField =
  | { key: string; type: 'text'; label: string }
  | { key: string; type: 'enum'; label: string; enumKey: string; options: readonly string[] }
  | { key: string; type: 'boolean'; label: string }                         // ex.: archived
  | { key: string; type: 'dateRange'; label: string; fromKey: string; toKey: string }
  | { key: string; type: 'month'; label: string }                           // YearMonth
  | { key: string; type: 'lookup'; label: string; lookup: LookupRef };      // conta, categoria, ativo, cartão
```

- Monta um `FormGroup` a partir das definições. **O formulário é a fonte de verdade:** cada mudança emite `changed` com o filtro
  novo (texto com `debounceTime(300)`, os demais ao mudar) e a tela chama `list.setFilter($event)`. O input `initial` (normalmente o
  `initialFilter` da lista) é o valor inicial. O botão "Limpar" faz `reset` do formulário para o `initial` e emite uma única vez. Em telas estreitas os filtros ficam num `p-drawer` com contador de filtros ativos.
- Os `key` têm o mesmo nome dos query params da API (`accountId`, `categoryId`, `from`, `to`...), então o filtro vai direto para o
  `toHttpParams` sem mapeamento.
- **Lookups** (`lookup`) usam componentes de seleção exportados pelas features: `AccountSelect`, `CategorySelect`
  (`p-treeselect` com subcategorias, filtrável por tipo), `AssetSelect`, `CreditCardSelect`.
- Os seletores consomem os endpoints **`GET /<recurso>/options`** (contas, categorias, cartões e ativos), que devolvem um resumo
  (`AccountSummary`, `CategorySummary`...) já ordenado por nome, em `PageResponse` (máximo de 100 por página). As opções ficam em
  cache num **`LookupService`** por recurso (signal carregado uma vez, invalidado quando a tela do recurso salva ou arquiva), para
  não repetir a chamada a cada formulário aberto. `/categories/options` já exclui a categoria de sistema.
- Se um usuário passar de 100 itens num lookup, o store busca as páginas seguintes; até lá, uma página basta.

### 4.6 `<app-crud-page>`, formulário em diálogo e `CrudActionsService`

```ts
// features/accounts/list/account-list.page.ts: tela de cadastro completa
@Component({
  selector: 'app-account-list-page',
  imports: [CrudPageComponent, FilterBarComponent, DataTableComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-crud-page title="accounts.title" (create)="openForm()">
      <app-filter-bar [fields]="filters" [initial]="list.filter()" (changed)="list.setFilter($event)" />
      <app-data-table [columns]="columns" [list]="list" [actions]="['edit', 'archive']"
                      (edit)="openForm($event)" (archive)="archive($event)" />
    </app-crud-page>
  `,
})
export class AccountListPage {
  private readonly api = inject(AccountApiService);
  private readonly crud = inject(CrudActionsService);

  readonly list = injectCrudList(this.api, {
    sort: { field: 'name', direction: 'asc' },
    initialFilter: { archived: false },
  });

  readonly columns: ColumnDef<Account>[] = [
    { field: 'name', header: 'accounts.fields.name' },
    { field: 'type', header: 'accounts.fields.type', type: 'enum', enumKey: 'accountType' },
    { field: 'institution', header: 'accounts.fields.institution' },
    { field: 'initialBalance', header: 'accounts.fields.initialBalance', type: 'money' },
  ];

  readonly filters: FilterField[] = [
    { key: 'name', type: 'text', label: 'accounts.fields.name' },
    { key: 'type', type: 'enum', label: 'accounts.fields.type', enumKey: 'accountType', options: ACCOUNT_TYPES },
    { key: 'archived', type: 'boolean', label: 'common.archived' },
  ];

  openForm(row?: Account) {
    this.crud.openForm(AccountFormComponent, { id: row?.id }).subscribe(saved => saved && this.list.reload());
  }

  archive(row: Account) {
    this.crud.confirmAndRun('archive', row.name, () => this.api.archive(row.id)).subscribe(() => this.list.reload());
  }
}
```

**`CrudActionsService`** (em `shared/crud/page`) junta o que toda tela repete:
- `openForm(Component, data)`: abre o formulário no `DialogService` do PrimeNG (`DynamicDialog`) e devolve um `Observable<boolean>`
  (salvou ou não).
- `confirmAndRun(action, name, op)`: `ConfirmationService` com texto traduzido ("Arquivar a conta Nubank?"), executa a operação e
  mostra toast de sucesso.
- `success(key)`: toast padronizado (`MessageService`).

**Formulário** (um componente por feature, aberto no diálogo):

```ts
// features/accounts/form/account-form.component.ts (resumo)
export class AccountFormComponent {
  private readonly api = inject(AccountApiService);
  private readonly ref = inject(DynamicDialogRef);
  private readonly id = inject(DynamicDialogConfig).data?.id as string | undefined;

  readonly form = inject(NonNullableFormBuilder).group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    type: ['CHECKING' as AccountType, Validators.required],
    institution: [''],
    initialBalance: [0, Validators.required],
  });

  readonly submit = injectFormSubmit(this.form, value =>
    this.id ? this.api.update(this.id, value) : this.api.create(value),
  ).onSuccess(() => this.ref.close(true));

  constructor() {
    if (this.id) this.api.get(this.id).subscribe(a => this.form.patchValue(a));
  }
}
```

```html
<app-form-shell [submit]="submit" (cancel)="ref.close(false)">
  <app-field label="accounts.fields.name" [control]="form.controls.name">
    <input pInputText formControlName="name" />
  </app-field>
  <app-field label="accounts.fields.initialBalance" [control]="form.controls.initialBalance">
    <p-inputnumber formControlName="initialBalance" mode="currency" currency="BRL" locale="pt-BR" />
  </app-field>
  ...
</app-form-shell>
```

- **`injectFormSubmit`** marca os campos como tocados, bloqueia envio duplo (`submitting` signal), chama a operação e, em erro
  `400 VALIDATION_ERROR`, aplica os erros de campo no formulário (seção 5.3).
- **`<app-form-shell>`** é o rodapé padrão (Cancelar / Salvar com loading) e exibe o `detail` de um 422 dentro do diálogo
  (`p-message`), sem fechar.
- **`<app-field>`** mostra rótulo, o controle e a mensagem de erro traduzida (`validation.required`, `validation.maxlength`...) ou
  o erro vindo do servidor.
- **Diálogo vs. página:** cadastros simples (contas, categorias, cartões, orçamentos, ativos, proventos) usam diálogo. Telas com
  mais contexto ganham rota própria: detalhe do cartão com as faturas (`/credit-cards/:id`) e detalhe da fatura com os lançamentos.

### 4.7 Componentes de formulário padronizados

| Dado | Componente | Configuração padrão |
|---|---|---|
| Dinheiro | `p-inputnumber` | `mode="currency" currency="BRL" locale="pt-BR"`, `[min]="0.01"` quando o valor precisa ser positivo |
| Quantidade/preço de ativo | `p-inputnumber` | `[minFractionDigits]="2" [maxFractionDigits]="8"` (backend usa `NUMERIC(19,8)`) |
| Data | `p-datepicker` | `dateFormat="dd/mm/yy"`, `showButtonBar`; conversão por `toLocalDate`/`fromLocalDate` |
| Mês | `p-datepicker` | `view="month" dateFormat="mm/yy"`; conversão por `toYearMonth` (dashboard: `2026-10`) ou `toLocalDate` do 1º dia (orçamento: `month=2026-10-01`, que no backend é `LocalDate`) |
| Enum | `p-select` | Opções a partir da lista do `*.model.ts`, rótulo traduzido (`enums.<enum>.<valor>`) |
| Categoria | `CategorySelect` (`p-treeselect`) | Filtra por tipo (receita/despesa) e esconde arquivadas e de sistema |
| Cor e ícone da categoria | `p-colorpicker` + seletor de PrimeIcons | O campo `icon` guarda a classe do PrimeIcons (`pi pi-shopping-cart`) |

## 5. Comunicação com a API

### 5.1 Interceptors

Registrados em `provideHttpClient(withFetch(), withInterceptors([...]))`, nesta ordem:

| Interceptor | Responsabilidade |
|---|---|
| `authInterceptor` | Adiciona `Authorization: Bearer <token>` nas chamadas para `/api` (exceto `/auth/**`) |
| `languageInterceptor` | Envia `Accept-Language: pt-BR` (constante do app), que o backend usa para localizar os erros. Quando o backend trocar o `locale-resolver` para `accept-header`, o `detail` dos erros já virá no idioma certo |
| `errorInterceptor` | Converte `HttpErrorResponse` em `ApiError` (seção 5.2), trata 401 e mostra toast |

### 5.2 Erros: `ProblemDetail` → `ApiError`

```ts
// core/http/api-error.ts
export interface ProblemDetail {
  status: number;
  title?: string;
  detail: string;                                  // texto para o usuário (já traduzido pelo backend)
  code: string;                                    // estável: 'transaction.TRANSFER_SAME_ACCOUNT'
  errors?: { field: string; message: string }[];   // só em common.VALIDATION_ERROR
}

export class ApiError extends Error {
  constructor(readonly status: number, readonly code: string, readonly detail: string,
              readonly fieldErrors: ProblemDetail['errors'] = []) { super(code); }
}
```

O que o `errorInterceptor` faz por status (alinhado à tabela da seção 3.8 do backend):

| Situação | Comportamento no front |
|---|---|
| 400 `common.VALIDATION_ERROR` | **Sem toast.** O formulário mostra os erros nos campos (seção 5.3) |
| 400 `common.MALFORMED_REQUEST` | Toast de erro (indica bug no front: logar no console em dev) |
| 401 em rota protegida | Limpa a sessão e redireciona para `/login?returnUrl=...`, com toast "Sessão expirada" |
| 401 `auth.INVALID_CREDENTIALS` | A tela de login mostra o `detail` no formulário |
| 403 / 404 | Toast com o `detail`; 404 em tela de detalhe redireciona para a listagem |
| 409 / 422 | Dentro de formulário: `p-message` no diálogo. Fora dele: toast com o `detail` |
| 500 / falha de rede | Toast genérico traduzido (`errors.unexpected` / `errors.network`) |

- **O front decide comportamento pelo `code` e exibe o `detail`**, como definido no backend. Não há catálogo de mensagens de erro
  duplicado no front: a tradução das mensagens de negócio é responsabilidade do backend (`messages/*.properties` + `Accept-Language`).
- Tratamento específico por código, quando necessário, fica na tela: `if (err.code === 'investment.INSUFFICIENT_QUANTITY') ...`.
- Uma chamada pode desligar o toast automático com `HttpContext` (`SKIP_ERROR_TOAST`), para quando a tela trata o erro sozinha.

### 5.3 Erros de validação nos campos

```ts
// shared/forms/server-errors.ts
export function applyServerErrors(form: FormGroup, error: ApiError): void {
  for (const { field, message } of error.fieldErrors ?? []) {
    form.get(field)?.setErrors({ server: message });   // <app-field> exibe errors.server como está
  }
}
```

Os nomes de campo do backend (`amount`, `transactionDate`) são os mesmos do formulário. Quando divergirem, o formulário declara o
mapeamento.

### 5.4 Models escritos à mão

Os tipos da API não são gerados: cada feature escreve seus `*.model.ts` espelhando os DTOs do backend.

```ts
// features/accounts/data/account.model.ts
export const ACCOUNT_TYPES = ['CHECKING', 'SAVINGS', 'WALLET', 'INVESTMENT', 'OTHER'] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  institution: string | null;   // pode vir nulo
  initialBalance: number;
}
```

- **Regra de nulidade:** campo que o backend pode devolver nulo é `T | null` (não `T | undefined` nem opcional); os demais são
  obrigatórios.
- Requests de criação e edição são interfaces próprias (`CreateAccountRequest`, `UpdateAccountRequest`), pelo mesmo motivo do
  `TCreate`/`TUpdate` da seção 4.2.
- Sem `schema.d.ts`, sem alias `@api/*` e sem script de geração. Quando o contrato do backend mudar, o model é ajustado à mão
  junto com a tela. Os services continuam finos sobre o `CrudApiService`.

### 5.5 Autenticação

- **Login/cadastro** (`POST /auth/login`, `/auth/register`) devolvem `{ accessToken, tokenType, expiresIn }`. O front guarda o
  token e o instante de expiração no `localStorage` e carrega o usuário com `GET /me`.
- **Login com Google** (`POST /auth/google`, body `{ idToken }`) devolve o mesmo `TokenResponse`; `AuthStoreService.loginWithGoogle()`
  inicia a sessão do mesmo jeito. O ID token vem do botão oficial do GIS (popup). **CSP e COOP** do deploy precisam liberar o GIS
  (`script-src`, `frame-src`, `connect-src`, `style-src` de `accounts.google.com/gsi/`; COOP `same-origin-allow-popups`).
- **`AuthStoreService`** (signals): `user`, `isAuthenticated`, `login()`, `register()`, `loginWithGoogle()`, `logout()`. Um timer faz logout automático na
  expiração (24h); sem refresh token, o usuário precisa logar de novo (mesma decisão do backend).
- **Guards:** `authGuard` nas rotas internas; `guestGuard` em `/login` e `/register` (logado vai para o dashboard).
- **Trade-off conhecido:** token no `localStorage` é acessível a um XSS. Mitigação: Angular sanitiza templates por padrão, não usar
  `innerHTML`/`bypassSecurityTrust*`, e CSP no deploy. Cookie `HttpOnly` fica para quando houver refresh token (fase 4).

## 6. Tema e layout

### 6.1 Preset: Noir sobre surface `slate`

O preset Noir mapeia a cor primária para os próprios tons da surface: o resultado é monocromático (botões e destaques em
quase-preto no tema claro e quase-branco no escuro). Aqui as duas paletas usam `slate`, um cinza levemente azulado.

```ts
// core/theme/my-finance.preset.ts
import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';

const slate = {
  50: '{slate.50}', 100: '{slate.100}', 200: '{slate.200}', 300: '{slate.300}', 400: '{slate.400}',
  500: '{slate.500}', 600: '{slate.600}', 700: '{slate.700}', 800: '{slate.800}', 900: '{slate.900}', 950: '{slate.950}',
};

export const MyFinancePreset = definePreset(Aura, {
  semantic: {
    primary: slate,
    colorScheme: {
      light: {
        surface: { 0: '#ffffff', ...slate },
        primary: { color: '{slate.950}', inverseColor: '#ffffff', hoverColor: '{slate.900}', activeColor: '{slate.800}' },
        highlight: { background: '{slate.950}', focusBackground: '{slate.700}', color: '#ffffff', focusColor: '#ffffff' },
      },
      dark: {
        surface: { 0: '#ffffff', ...slate },
        primary: { color: '{slate.50}', inverseColor: '{slate.950}', hoverColor: '{slate.100}', activeColor: '{slate.200}' },
        highlight: {
          background: 'rgba(248, 250, 252, .16)', focusBackground: 'rgba(248, 250, 252, .24)',
          color: 'rgba(255, 255, 255, .87)', focusColor: 'rgba(255, 255, 255, .87)',
        },
      },
    },
  },
});
```

```ts
// app.config.ts (trecho)
providePrimeNG({
  theme: {
    preset: MyFinancePreset,
    options: {
      darkModeSelector: '.app-dark',
      cssLayer: { name: 'primeng', order: 'theme, base, primeng' },   // convivência com o Tailwind v4
    },
  },
  ripple: false,
}),
```

```css
/* styles.css */
@import 'tailwindcss';
@import 'tailwindcss-primeui';
@custom-variant dark (&:where(.app-dark, .app-dark *));
```

- **Cores com significado financeiro** ficam fora do preset monocromático, como variáveis próprias em `styles.css`:
  `--app-income` (verde), `--app-expense` (vermelho), `--app-transfer` (azul), com variações para o modo escuro, referenciando a
  paleta do PrimeNG (`var(--p-green-600)` etc.). Usadas pelo `<app-money>` (valor com sinal e cor pelo tipo) e pelos gráficos.
- **Cores de categoria** vêm do campo `color` cadastrado pelo usuário (gráfico de despesas por categoria, tags).
- **`ThemeService`**: preferência `claro | escuro | sistema` (padrão: sistema), salva no `localStorage`, aplicada como classe
  `.app-dark` no `<html>`. Expõe um signal `isDark` usado pelos gráficos.
- Regra: **cor só por token** (`var(--p-...)`, `var(--app-...)` ou utilitários do `tailwindcss-primeui`, como `bg-surface-0`,
  `text-muted-color`). Nada de hexadecimal solto em componente.

### 6.2 Layout

- **Shell:** topbar (nome do app, alternância de tema, menu do usuário com Perfil/Sair) + menu lateral fixo no desktop e em
  `p-drawer` no mobile. O menu é montado a partir de uma lista de itens com texto, ícone e rota. Item com `badge` (um
  `Signal<number>`) mostra o contador quando o valor é maior que zero; hoje só "Importações" usa, com a fila pendente.
- **Responsividade:** desktop é o uso principal, mas tudo precisa funcionar no celular. Tabelas com rolagem horizontal e colunas
  secundárias ocultas em telas pequenas; filtros em drawer.
- **Acessibilidade:** regras de acessibilidade do angular-eslint nos templates (seção 8); componentes do PrimeNG já trazem ARIA.

## 7. Textos e idioma

### 7.1 Decisão: textos direto no código, em português

O app tem um único idioma (pt-BR) e não troca idioma em tempo de execução. Por isso não há biblioteca de i18n: os textos ficam
nos templates e nos arquivos TS, em português. Isso remove o build por idioma e o JSON de traduções que o Transloco exigia.
Se um dia houver outro idioma, a troca passa por `@angular/localize` (atributos `i18n` e `$localize`), que é o nativo do Angular.

### 7.2 Regras

- **Textos visíveis em português, direto no template ou no TS.** Configs de colunas, filtros, títulos e toasts recebem o texto pronto.
- **Enums** (`CHECKING`, `PENDING` etc.) são traduzidos por `src/app/shared/i18n/enum-labels.ts`: o mapa `ENUM_LABELS` e o pipe
  `enumLabel` (`{{ item.status | enumLabel: transactionStatus }}`). O backend devolve só o código.
- **Mensagens de erro de negócio vêm do backend** (`detail`). O `languageInterceptor` envia `Accept-Language: pt-BR` (constante em
  `core/i18n/locale.ts`), porque o backend usa esse header para localizar as mensagens.
- **Erros de validação do Angular** viram texto em `shared/forms/validation-message.ts`.
- **Formatação** de moeda, data e número usa o locale do Angular (`LOCALE_ID` + pipes `currency`, `date`), nunca formatação manual.
- **Componentes do PrimeNG** (datepicker, paginator, confirm) recebem a tradução `pt_BR` do `primelocale` na inicialização (`core/i18n/i18n.providers.ts`).

## 8. Lint e formatação

- **ESLint (flat config)** com `angular-eslint` + `typescript-eslint`, instalado com `ng add angular-eslint`.
- **Prettier** para formatação (o ESLint não cuida de estilo), com `eslint-config-prettier` desligando as regras conflitantes.
- **Husky + lint-staged:** no pre-commit, `eslint --fix` e `prettier --write` só nos arquivos alterados.
- `.editorconfig` com 2 espaços e LF.

```js
// eslint.config.js (resumo)
module.exports = tseslint.config(
  {
    files: ['**/*.ts'],
    extends: [eslint.configs.recommended, ...tseslint.configs.strict, ...tseslint.configs.stylistic, ...angular.configs.tsRecommended],
    processor: angular.processInlineTemplates,
    rules: {
      '@angular-eslint/component-selector': ['error', { type: 'element', prefix: 'app', style: 'kebab-case' }],
      '@angular-eslint/directive-selector': ['error', { type: 'attribute', prefix: 'app', style: 'camelCase' }],
      '@angular-eslint/prefer-on-push-component-change-detection': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      'no-restricted-imports': ['error', {
        patterns: [{ group: ['@features/*/*'], message: 'Importe pela API pública da feature (@features/<nome>).' }],
      }],
    },
  },
  {
    files: ['**/*.html'],
    extends: [...angular.configs.templateRecommended, ...angular.configs.templateAccessibility],
    rules: { '@angular-eslint/template/prefer-control-flow': 'error' },
  },
  prettierConfig,
);
```

```json
// .prettierrc
{ "singleQuote": true, "printWidth": 120, "trailingComma": "all", "plugins": ["prettier-plugin-tailwindcss"],
  "overrides": [{ "files": "*.html", "options": { "parser": "angular" } }] }
```

Aliases no `tsconfig.json`: `@core/*`, `@shared/*`, `@features/*`, `@env/*`. Sem `../../..` entre camadas.

Scripts do `package.json`:

| Script | Comando |
|---|---|
| `start` | `ng serve --proxy-config proxy.conf.json` |
| `build` | `ng build` |
| `test` | `ng test` (Vitest) |
| `lint` | `ng lint` |
| `format` | `prettier --write .` |

## 9. Testes

Mesmo critério do backend: **só testes unitários de lógica**, sem testes de componente ou e2e por enquanto.

- **Testar:** `toHttpParams` e helpers de data (incluindo o caso do fuso), `applyServerErrors`, `injectCrudList` (filtro novo volta à
  página 0), conversão do `onLazyLoad` em `PageRequest`, `AuthStoreService` (expiração do token, `loginWithGoogle`),
  `GoogleIdentityService` (script carregado uma vez, callback, falha do script), montagem da árvore
  de categorias, `errorInterceptor` (status → comportamento), `PluggyConnectService` (SDK mockado: resultado do widget).
  `ImportCountStore` (erro mantém o último valor), `toApproveRequest` (separa itens com e sem categoria no lote),
  `importFromRange` (limite de 12 meses, fim de mês como o backend) e `importFromChange` (igual, mais recente ou mais antiga).
- **Não testar:** templates, telas de CRUD declarativas, componentes do PrimeNG, services que só repassam para o `CrudApiService`.
- Ferramentas: Vitest + `TestBed` só quando precisar de injeção; `provideHttpClientTesting` para os services.

## 10. Versões e licença do PrimeNG

- **PrimeNG 21.x é MIT.** A partir do **PrimeNG 22** a PrimeTek passou a distribuir a biblioteca sob a licença comercial
  **PrimeUI**: o pacote exige chave de licença e, sem ela, mostra um aviso de licença inválida na tela.
- Existe uma **licença Community gratuita** (pessoas físicas, estudantes, projetos sem fins comerciais e empresas pequenas, com
  limites de receita e de equipe), renovada anualmente. Um projeto pessoal como este se enquadra.
- **Decisão:** usar **Angular 21 + PrimeNG 21** (fixar `primeng` em `~21.x` no `package.json`; o Renovate/Dependabot não deve
  subir para a 22 sozinho).
- **Quando migrar para o Angular 22** (o 21 tem suporte LTS até cerca de maio de 2027), o PrimeNG 22 vai junto: registrar a chave
  Community nessa hora. A camada de CRUD (seção 4) concentra o uso do PrimeNG, o que limita o impacto se um dia for preciso trocar
  de biblioteca.

## 11. Telas e rotas por fase

Alinhadas ao roadmap e aos endpoints do backend (seções 6 e 7 do escopo-backend).

**Fase 1: MVP financeiro**

| Rota | Tela | Endpoints |
|---|---|---|
| `/login`, `/register` | Login e cadastro, com botão "Entrar com o Google" | `POST /auth/login`, `POST /auth/register`, `POST /auth/google` |
| `/dashboard` | Seletor de mês, cards (saldo total, receitas, despesas, resultado), rosca de despesas por categoria | `GET /dashboard/summary?month=`, `GET /dashboard/expenses-by-category?month=` |
| `/accounts` | CRUD de contas + saldo atual e projetado por conta | `/accounts`, `GET /accounts/{id}/balance` |
| `/categories` | CRUD em árvore (categoria → subcategoria), abas Receita/Despesa | `/categories` (sem `GET /{id}` e sem `DELETE`) |
| `/transactions` | Extrato filtrável (período, conta, categoria, tipo, status, descrição); criar receita/despesa/transferência; efetivar lançamento pendente | `/transactions`, `POST /transactions/transfers` |
| `/profile` | Dados do usuário | `GET/PUT /me` |

**Fase 2: cartões e planejamento**

| Rota | Tela | Endpoints |
|---|---|---|
| `/credit-cards` | CRUD de cartões | `/credit-cards` |
| `/credit-cards/:id` | Faturas do cartão, nova compra (à vista ou parcelada) | `GET /credit-cards/{id}/invoices`, `POST /credit-cards/{id}/purchases` |
| `/credit-cards/:id/invoices/:invoiceId` | Lançamentos da fatura, fechar, pagar, excluir compra | `GET /credit-cards/{id}/invoices/{invoiceId}`, `GET /transactions?creditCardInvoiceId=`, `POST .../invoices/{invoiceId}/close`, `POST .../invoices/{invoiceId}/payment` (corpo opcional: `accountId`, `date`), `DELETE /credit-cards/{id}/purchases/{transactionId}` (todas as parcelas) |
| `/budgets` | Orçamentos do mês com barra planejado × realizado (`spent`) | `/budgets?month=2026-10-01` (`LocalDate`, 1º dia do mês) |

**Fase 3: investimentos**

| Rota | Tela | Endpoints |
|---|---|---|
| `/investments` | Carteira: custo total, distribuição por classe (rosca), posições abertas | `GET /investments/portfolio` |
| `/investments/assets` | CRUD de ativos (com detalhe de renda fixa condicional) + posição | `/investments/assets`, `GET /assets/{id}/position` |
| `/investments/operations` | CRUD de operações | `/investments/operations` |
| `/investments/incomes` | CRUD de proventos | `/investments/incomes` |

**Integrações (bancos via Pluggy, spec `docs/superpowers/specs/2026-10-14-integracoes-design.md`)**

| Rota | Tela | Endpoints |
|---|---|---|
| `/integrations` | Credenciais da Pluggy, bancos conectados (renomear, excluir, conectar pelo widget, sincronizar), contas do banco (vincular, criar com data de corte, ignorar, ajustar saldo, alterar data de corte) e histórico paginado | `/integrations/pluggy`, `/integrations/pluggy/connect-token`, `/integrations/pluggy/connections`, `/integrations/pluggy/sync`, `/integrations/pluggy/accounts`, `/integrations/pluggy/accounts/{linkId}/import-from`, `/integrations/pluggy/logs` |

**Importações (fila de revisão, spec `docs/superpowers/specs/2026-10-15-importacoes-design.md`)**

| Rota | Tela | Endpoints |
|---|---|---|
| `/imports` | Fila de revisão: filtros por status, conta, período e possível transferência; aprovar ou ignorar, um a um ou em lote | `/imports`, `/imports/count`, `/imports/approve`, `/imports/ignore` |

Regras de tela que vêm do backend e precisam ser respeitadas na UI:
- Lançamentos de cartão e de categoria de sistema não são editáveis em `/transactions`: esconder editar/excluir e linkar para a fatura.
- Categoria de sistema não aparece nos seletores; categorias arquivadas só aparecem com o filtro "arquivados".
- Na subcategoria o tipo é herdado do pai (campo desabilitado); tipo e pai não mudam na edição.
- Compra no cartão não tem edição (excluir e criar de novo); fatura `CLOSED`/`PAID` não aceita compras.
- Orçamento: na edição só o valor é editável. Detalhe de renda fixa só aparece para `FIXED_INCOME`/`TREASURY`.
- **Status do lançamento:** data futura nasce `PENDING`, data de hoje ou passada nasce `CLEARED` (regra do backend quando o status
  é omitido). O saldo atual e o "saldo total" do dashboard só consideram `CLEARED`; receitas e despesas do mês consideram os dois.
  A UI mostra o status como tag, oferece a ação **"Efetivar"** nos pendentes (um `PUT /transactions/{id}` com `status: CLEARED`
  e os demais campos da linha) e, na tela de contas, exibe o saldo atual e o projetado (que inclui os pendentes).
- **Tipo do lançamento não muda na edição** (`UpdateTransactionRequest` não tem `type`): o formulário desabilita o campo.
- **Saldo por conta:** `AccountResponse` não traz saldo. A listagem de contas busca `/accounts/{id}/balance` para cada linha
  visível (N+1 aceito: são poucas contas). Se incomodar, pedir `currentBalance` na listagem (seção 15).
- **Usuário sem categorias:** o seed de categorias padrão no cadastro ainda está pendente no backend. Enquanto isso, o formulário
  de lançamento sem categorias mostra um estado vazio com link para `/categories`.
- **Extrato sem totais:** a API não devolve totais do filtro (receitas, despesas e resultado do período). O extrato não mostra
  totais até existir o endpoint (seção 15); o front não soma páginas para isso.

## 12. Gráficos (ngx-echarts)

- `provideEchartsCore({ echarts })` com **import modular** (`echarts/core` + só os gráficos e componentes usados: `PieChart`,
  `BarChart`, `LineChart`, `TooltipComponent`, `LegendComponent`, `GridComponent`, `CanvasRenderer`), registrado uma vez em
  `shared/ui/chart/echarts.ts`.
- **`<app-chart>`** (wrapper em `shared/ui`) recebe as `options` da tela e aplica por cima a base visual: cores de texto, eixos e
  tooltip lidas das variáveis CSS do tema (`--p-text-color`, `--p-text-muted-color`, `--p-content-border-color`), formatação de
  moeda em `pt-BR` nos tooltips e eixos, e recálculo quando o `ThemeService.isDark` muda. O contêiner precisa de altura definida.
- Gráficos previstos: rosca de despesas por categoria (cor = `category.color`), barras de orçamento planejado × realizado (fase 2),
  rosca de distribuição da carteira por classe (fase 3). Evolução mensal (linha) fica para quando houver endpoint.

## 13. Ambiente de desenvolvimento

```json
// proxy.conf.json: evita CORS em dev; o front chama /api/v1 no mesmo host
{ "/api": { "target": "http://localhost:8080", "secure": false } }
```

- `environment.ts`: `googleClientId` (mesmo valor do `GOOGLE_CLIENT_ID` da API; vazio esconde o botão do Google). No Google Cloud Console, o cliente OAuth (tipo *Aplicativo da Web*) precisa das origens `http://localhost`,
  `http://localhost:4200` e a de produção em *Origens JavaScript autorizadas*.
- `environment.ts`: `apiUrl: '/api/v1'`. Em produção, o front é servido no mesmo domínio da API (proxy
  reverso) ou a API passa a liberar o domínio no CORS. **Hoje o backend não tem configuração de CORS**: em dev o proxy resolve;
  para produção é decisão em aberto (seção 15).
- Node LTS compatível com o Angular 21. Criação do projeto:
  `ng new my-finance-web --style=css --routing --ssr=false` (com Tailwind) e depois `ng add angular-eslint`.
- Pacotes: `primeng@^21`, `@primeuix/themes`, `primeicons`, `tailwindcss-primeui`, `primelocale`,
  `ngx-echarts@^21`, `echarts`; dev: `prettier`,
  `prettier-plugin-tailwindcss`, `eslint-config-prettier`, `husky`, `lint-staged`. Conferir no `npm` as versões compatíveis
  (`peerDependencies`) de cada um com o Angular 21 na instalação.

## 14. Roadmap do frontend

| Fase | Entregas |
|---|---|
| **0a. Fundação** | Projeto Angular 21, lint/Prettier/Husky, Tailwind + PrimeNG com o preset, tema claro/escuro, Transloco + `primelocale`, shell |
| **0b. Protótipo** | Camada de CRUD (seção 4) com testes, interceptors e `ApiError`, `AuthStoreService`/guards, telas de login, dashboard, contas, categorias e extrato, direto contra a API real. **Checkpoint: validação do design** |
| **0c. Integração** | Cadastro, CI (lint + test + build + i18n:check) |
| **1. MVP financeiro** | Contas, categorias, lançamentos e transferências, dashboard mensal, perfil |
| **2. Cartões e planejamento** | Cartões, faturas, compras parceladas, pagamento de fatura, orçamentos |
| **3. Investimentos** | Ativos, operações, proventos, carteira |
| **4. Evoluções** | Segundo idioma (`en`), PWA/instalável, importação OFX/CSV (quando houver API), relatórios anuais, migração para Angular 22 + PrimeNG 22 (licença Community) |

## 15. Decisões

| Tema | Decisão |
|---|---|
| Framework | Angular 21, standalone, signals, zoneless, OnPush em tudo |
| UI | PrimeNG 21 (MIT), fixado na linha 21 |
| Tema | Preset Aura customizado: Noir (primária monocromática) + surface `slate`; modo escuro por `.app-dark` (claro/escuro/sistema) |
| CSS | Tailwind v4 + `tailwindcss-primeui` só para layout; cores por token |
| Gráficos | ngx-echarts com import modular e wrapper `<app-chart>` ligado ao tema |
| Estado | Signals; sem biblioteca de estado |
| Formulários | Reactive Forms tipados; Signal Forms só quando sair de experimental |
| CRUD | `CrudApiService` + `injectCrudList` + `<app-data-table>`/`<app-filter-bar>`/`<app-crud-page>` + `CrudActionsService`; formulário em diálogo |
| Filtros | Declarativos, nomes iguais aos query params da API; o formulário é a fonte de verdade e o filtro não vai para a URL |
| Erros | `ProblemDetail` → `ApiError`; comportamento pelo `code`, texto pelo `detail`; erros de campo aplicados no formulário |
| Textos | Português direto no código, sem biblioteca de i18n; mensagens de negócio vêm do backend via `Accept-Language` |
| Models da API | Escritos à mão (`T \| null` nos campos anuláveis), sem OpenAPI; services escritos à mão |
| Auth | JWT no `localStorage`, logout na expiração, sem refresh token |
| Lint | angular-eslint + typescript-eslint strict + Prettier + Husky; import só pela API pública da feature |
| Testes | Vitest, só lógica reutilizável |

| Protótipo | A API mock (`mockApiInterceptor`, configuração `mock`, `start:mock`) foi removida: o protótipo roda contra o backend real |
| Geração de tipos | `openapi-typescript`, `schema.d.ts` e o alias `@api/*` foram removidos em favor de models à mão |
| Filtro na URL | Removido: `syncWithUrl` e a leitura/gravação de query params saíram do `injectCrudList` |
| Nomes | Classes `@Injectable` e bases abstratas em `<nome>.service.ts` / `<Nome>Service`; `shared/crud` em subpastas; features importam de `shared/` só pelas barrels |
| Lookups | Endpoints `/options` com cache no `LookupService` |

**Em aberto:**
- Lançamentos recorrentes e tags (dependem do modelo no backend, fase 2).
- Endpoint de evolução mensal (receitas × despesas por mês) para um gráfico de linha no dashboard.
- Onde hospedar e como servir em produção (mesmo domínio com proxy reverso ou CORS; o backend ainda não configura CORS).

**Pedidos ao backend** (melhorias que o front consegue contornar, mas que ficam melhores na API):

| Pedido | Contorno atual no front |
|---|---|
| Seed de categorias padrão no `register` | Estado vazio com link para `/categories` |
| Totais do filtro no extrato (receitas, despesas, resultado do período) | Extrato sem totais |
| `currentBalance` na listagem de contas | Uma chamada a `/balance` por conta visível |
| `GET /categories/{id}` | Formulário de edição recebe a linha da tabela |
| Configuração de CORS para produção | Proxy em dev; em produção, mesmo domínio |
| `month` do orçamento como `YearMonth` (igual ao dashboard) | Helper converte para o 1º dia do mês |
