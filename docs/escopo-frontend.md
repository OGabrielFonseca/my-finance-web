# MyFinance — Escopo inicial do Frontend (my-finance-web)

> Versão 0.2 · 12/10/2026 · Documento vivo: atualizar conforme as decisões evoluírem.
>
> **Mudanças na v0.2** (revisão contra o código do backend): rotas aninhadas de faturas e compras; lookups pelos endpoints
> `/options` com `LookupStore`; categoria sem `GET /{id}` (o formulário recebe a linha); `month` do orçamento é `LocalDate`;
> requests distintos de criação e edição; saldo por conta via `/balance` (atual e projetado); ação de efetivar lançamento;
> estado vazio sem categorias; CORS movido para "em aberto"; nova fase **0b. Protótipo com API mock**; lista de pedidos ao backend
> (seção 15).
>
> **Decisões fechadas na v0.1:** **Angular 21** (standalone, signals, zoneless) + **PrimeNG 21** (MIT) com preset **Noir sobre surface
> `slate`** e modo escuro; **ngx-echarts** para gráficos; **i18n em runtime com Transloco** (só `pt-BR` por enquanto, estrutura pronta
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
| Formulários | **Reactive Forms tipados** | Signal Forms ainda é experimental no 21: não usar por enquanto |
| HTTP | `HttpClient` (`withFetch`) + interceptors funcionais | |
| Estado | **Signals** (`signal`, `computed`, `linkedSignal`) | Sem NgRx/biblioteca de estado: o estado é local à tela ou em stores simples |
| i18n | **Transloco** (`@jsverse/transloco`) | Traduções em JSON carregadas em runtime, com escopo por feature; ver seção 7 |
| Tipos da API | **`openapi-typescript`** | Gera **só os tipos** a partir do `/v3/api-docs` do springdoc; os services são escritos à mão sobre a base genérica |
| Lint/format | **angular-eslint** + **typescript-eslint** + **Prettier** + Husky/lint-staged | Ver seção 8 |
| Testes | **Vitest** (runner padrão do Angular 21) | **Só testes unitários da lógica reutilizável**, no mesmo espírito do backend; ver seção 9 |
| Locale | `pt-BR`, moeda `BRL` | `LOCALE_ID`, `DEFAULT_CURRENCY_CODE`, tradução dos componentes do PrimeNG via `primelocale` |

## 3. Arquitetura e organização

### 3.1 Estrutura de pastas: espelha os módulos do backend

```
src/
├── app/
│   ├── core/                        # singleton, carregado uma vez
│   │   ├── auth/                    # AuthStore, authGuard, guestGuard, authInterceptor, token storage
│   │   ├── http/                    # errorInterceptor, languageInterceptor, ApiError
│   │   ├── i18n/                    # TranslocoHttpLoader, configuração do Transloco e do PrimeNG
│   │   ├── theme/                   # preset do PrimeNG, ThemeService (claro/escuro/sistema)
│   │   └── layout/                  # ShellComponent (topbar + menu lateral), páginas de erro
│   ├── shared/                      # reutilizável, sem regra de negócio
│   │   ├── crud/                    # CrudApi, injectCrudList, DataTable, FilterBar, CrudPage, FormDialog, CrudActions
│   │   ├── data/                    # PageResponse, PageRequest, toHttpParams, datas (LocalDate/YearMonth)
│   │   ├── forms/                   # FieldComponent, applyServerErrors, validadores
│   │   ├── ui/                      # MoneyComponent (+/-), StatCard, EmptyState, ChartComponent
│   │   └── pipes/                   # money, localDate, yearMonth, enumLabel
│   ├── features/                    # um diretório por módulo do backend
│   │   ├── auth/                    # login, cadastro
│   │   ├── profile/                 # /me
│   │   ├── dashboard/
│   │   ├── accounts/
│   │   ├── categories/
│   │   ├── transactions/
│   │   ├── credit-cards/            # cartões, faturas, compras
│   │   ├── budgets/
│   │   └── investments/             # ativos, operações, proventos, carteira
│   ├── mock/                        # API falsa da fase 0b (só na configuração `mock`; ver seção 13)
│   ├── app.config.ts
│   └── app.routes.ts
├── api/
│   └── schema.d.ts                  # gerado pelo openapi-typescript (não editar)
└── styles.css
public/
└── i18n/                            # traduções (seção 7)
```

Estrutura de uma feature (exemplo: `accounts`):

```
features/accounts/
├── index.ts                         # API pública da feature (o que outras features podem importar)
├── accounts.routes.ts               # rotas lazy + provideTranslocoScope('accounts')
├── data/
│   ├── account.model.ts             # tipos (derivados do schema gerado) + listas de enums
│   └── account.api.ts               # AccountApi extends CrudApi
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
- **Feature não importa arquivo interno de outra feature.** Só o que estiver no `index.ts` dela (ex.: `AccountApi`, `AccountSelect`,
  tipos). É o equivalente ao "service público do módulo" do backend, e o lint quebra se alguém fizer import profundo (seção 8).
- **`shared/` não conhece features.** `core/` não conhece features, exceto `app.routes.ts` e o menu.
- **Componentes de página** (`*.page.ts`) montam a tela e chamam services; **componentes de UI** em `shared/ui` só recebem `input()`
  e emitem `output()`, sem acessar HTTP.
- **Nada de texto fixo no template:** todo texto visível vem do Transloco (seção 7). Exceções: dados vindos da API
  (nomes cadastrados pelo usuário, `detail` dos erros).
- **Nada de cálculo financeiro no front.** Saldos, totais de fatura, posição e preço médio vêm prontos da API (são derivados no
  backend). O front só formata e soma para exibição quando a própria API não entrega o total.

### 3.3 Nomes de arquivos

| Sufixo | Conteúdo |
|---|---|
| `*.page.ts` | Componente roteado (uma tela) |
| `*.component.ts` | Componente reutilizável ou parte de tela |
| `*.api.ts` | Service HTTP de um recurso |
| `*.model.ts` | Tipos e constantes (enums) |
| `*.store.ts` | Estado compartilhado com signals (raro; ex.: `AuthStore`, lookups) |
| `*.routes.ts` | Rotas da feature |
| `*.spec.ts` | Teste unitário (Vitest) |

Templates e estilos inline nos componentes pequenos; arquivo `.html` separado quando o template passar de ~40 linhas.

## 4. Camada reutilizável de CRUD

Peças, de baixo para cima:

```
CrudApi (HTTP)  →  injectCrudList (estado da listagem + URL)  →  <app-filter-bar> + <app-data-table>  →  <app-crud-page>
                                                          CrudActions (diálogo de formulário, confirmação, toast)
```

### 4.1 Contratos da API no front

Espelham o `PageResponse` e o `ProblemDetail` do backend (escopo-backend, seções 3.4 e 3.8):

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

### 4.2 `CrudApi`: service HTTP genérico

```ts
// shared/crud/crud-api.ts
export abstract class CrudApi<T extends { id: string }, TCreate, TUpdate = TCreate, TFilter extends object = object> {
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
// features/accounts/data/account.api.ts: só declara o que for específico
@Injectable({ providedIn: 'root' })
export class AccountApi extends CrudApi<Account, CreateAccountRequest, UpdateAccountRequest, AccountFilter> {
  protected readonly path = '/accounts';

  balance(id: string): Observable<AccountBalance> {
    return this.http.get<AccountBalance>(`${this.url}/${id}/balance`);
  }
}
```

- Nem todo recurso tem todas as operações (categorias não têm `DELETE`, lançamentos não têm `archive`). A base expõe todas, e
  **a tela declara quais ações mostra** (`actions` da tabela, seção 4.4). Separar em interfaces por operação seria abstração sem ganho.
- Recursos que fogem do CRUD (faturas, pagamento, compras parceladas, posição, carteira, dashboard) ganham **métodos próprios** no
  `*.api.ts` da feature ou um service simples sem herdar `CrudApi`.
- **Recursos aninhados** (faturas e compras ficam sob o cartão: `/credit-cards/{cardId}/invoices/{invoiceId}`) não herdam
  `CrudApi`: o service recebe o `cardId` em cada método (`invoices(cardId, page)`, `close(cardId, invoiceId)`...).
- **Criação e edição podem ter corpos diferentes** (ex.: `CreateAccountRequest` × `UpdateAccountRequest`, `UpdateCategoryRequest`
  sem `type`/`parentId`, `UpdateTransactionRequest` sem `type`). Por isso `CrudApi` tem `TCreate` e `TUpdate` separados.
- **Nem todo recurso tem `GET /{id}`** (categorias não têm). Nesses casos o formulário de edição recebe a linha da tabela pelo
  `DynamicDialogConfig.data` em vez de buscar pelo id.

### 4.3 `injectCrudList`: estado da listagem

Função de injeção (no lugar de classe base) que concentra o estado de uma listagem: filtro, página, ordenação, carregamento
e sincronização com a URL.

```ts
// shared/crud/crud-list.ts (resumo)
export interface CrudListOptions<F> {
  sort?: SortSpec;                   // ordenação inicial
  size?: number;                     // padrão 20
  initialFilter?: Partial<F>;        // ex.: { archived: false }
  syncWithUrl?: boolean;             // padrão true
}

export function injectCrudList<T extends { id: string }, F extends object>(
  api: CrudApi<T, unknown, unknown, F>,
  options: CrudListOptions<F> = {},
) {
  const filter = signal<Partial<F>>(readFilterFromUrl() ?? options.initialFilter ?? {});
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

- **Filtro na URL** (`/transactions?from=2026-10-01&accountId=...&page=2`): voltar do navegador, recarregar a página e compartilhar
  link mantêm a busca. A gravação usa `router.navigate([], { queryParams, replaceUrl: true })`. A leitura converte os tipos
  conforme a definição dos filtros (seção 4.5).
- **Erro na busca:** o `errorInterceptor` já mostra o toast (seção 5.2). A lista mantém os dados anteriores.
- Por que função e não classe base: chamada em inicializador de campo (`readonly list = injectCrudList(...)`), roda no contexto de
  injeção, não depende de herança, e cada tela pode ter mais de uma lista.
- `rxResource`/`httpResource` podem substituir o miolo quando estiverem estáveis. A API pública (`items`, `setFilter`...) não muda.

### 4.4 `<app-data-table>`: tabela declarativa sobre `p-table`

Tabela em modo **lazy** (paginação e ordenação no servidor). As colunas são declaradas e a formatação por tipo é automática:

```ts
// shared/crud/column.ts
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
// shared/crud/filter.ts
export type FilterField =
  | { key: string; type: 'text'; label: string }
  | { key: string; type: 'enum'; label: string; enumKey: string; options: readonly string[] }
  | { key: string; type: 'boolean'; label: string }                         // ex.: archived
  | { key: string; type: 'dateRange'; label: string; fromKey: string; toKey: string }
  | { key: string; type: 'month'; label: string }                           // YearMonth
  | { key: string; type: 'lookup'; label: string; lookup: LookupRef };      // conta, categoria, ativo, cartão
```

- Monta um `FormGroup` a partir das definições; texto com `debounceTime(300)`, os demais aplicam ao mudar.
- Botão "Limpar" volta ao `initialFilter`. Em telas estreitas os filtros ficam num `p-drawer` com contador de filtros ativos.
- Os `key` têm o mesmo nome dos query params da API (`accountId`, `categoryId`, `from`, `to`...), então o filtro vai direto para o
  `toHttpParams` sem mapeamento.
- **Lookups** (`lookup`) usam componentes de seleção exportados pelas features: `AccountSelect`, `CategorySelect`
  (`p-treeselect` com subcategorias, filtrável por tipo), `AssetSelect`, `CreditCardSelect`.
- Os seletores consomem os endpoints **`GET /<recurso>/options`** (contas, categorias, cartões e ativos), que devolvem um resumo
  (`AccountSummary`, `CategorySummary`...) já ordenado por nome, em `PageResponse` (máximo de 100 por página). As opções ficam em
  cache num **`LookupStore`** por recurso (signal carregado uma vez, invalidado quando a tela do recurso salva ou arquiva), para
  não repetir a chamada a cada formulário aberto. `/categories/options` já exclui a categoria de sistema.
- Se um usuário passar de 100 itens num lookup, o store busca as páginas seguintes; até lá, uma página basta.

### 4.6 `<app-crud-page>`, formulário em diálogo e `CrudActions`

```ts
// features/accounts/list/account-list.page.ts: tela de cadastro completa
@Component({
  selector: 'app-account-list-page',
  imports: [CrudPageComponent, FilterBarComponent, DataTableComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-crud-page title="accounts.title" (create)="openForm()">
      <app-filter-bar [fields]="filters" [value]="list.filter()" (changed)="list.setFilter($event)" />
      <app-data-table [columns]="columns" [list]="list" [actions]="['edit', 'archive']"
                      (edit)="openForm($event)" (archive)="archive($event)" />
    </app-crud-page>
  `,
})
export class AccountListPage {
  private readonly api = inject(AccountApi);
  private readonly crud = inject(CrudActions);

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

**`CrudActions`** (service em `shared/crud`) junta o que toda tela repete:
- `openForm(Component, data)`: abre o formulário no `DialogService` do PrimeNG (`DynamicDialog`) e devolve um `Observable<boolean>`
  (salvou ou não).
- `confirmAndRun(action, name, op)`: `ConfirmationService` com texto traduzido ("Arquivar a conta Nubank?"), executa a operação e
  mostra toast de sucesso.
- `success(key)`: toast padronizado (`MessageService`).

**Formulário** (um componente por feature, aberto no diálogo):

```ts
// features/accounts/form/account-form.component.ts (resumo)
export class AccountFormComponent {
  private readonly api = inject(AccountApi);
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
| `languageInterceptor` | Envia `Accept-Language` com o idioma ativo do Transloco (hoje sempre `pt-BR`). Quando o backend trocar o `locale-resolver` para `accept-header`, o `detail` dos erros já virá no idioma certo |
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

### 5.4 Tipos gerados do OpenAPI

```bash
npm run api:types   # openapi-typescript http://localhost:8080/v3/api-docs -o src/api/schema.d.ts
```

```ts
// features/accounts/data/account.model.ts
import type { components } from '@api/schema';

export type Account = components['schemas']['AccountResponse'];
export type CreateAccountRequest = components['schemas']['CreateAccountRequest'];
export type UpdateAccountRequest = components['schemas']['UpdateAccountRequest'];
export type AccountBalance = components['schemas']['AccountBalanceResponse'];   // initialBalance, currentBalance, projectedBalance
export type AccountType = Account['type'];
export const ACCOUNT_TYPES = ['CHECKING', 'SAVINGS', 'WALLET', 'INVESTMENT', 'OTHER'] as const satisfies readonly AccountType[];
```

- O `schema.d.ts` é **versionado** (o build não depende da API no ar) e regenerado quando um contrato mudar.
- O `satisfies` faz a lista de enums quebrar a compilação se o backend adicionar ou remover um valor.
- Por que não gerar os services (`openapi-generator`): eles não herdariam o `CrudApi`, a paginação e o `toHttpParams` do projeto.
  Os tipos já garantem o contrato; os services são poucos e finos.

### 5.5 Autenticação

- **Login/cadastro** (`POST /auth/login`, `/auth/register`) devolvem `{ accessToken, tokenType, expiresIn }`. O front guarda o
  token e o instante de expiração no `localStorage` e carrega o usuário com `GET /me`.
- **`AuthStore`** (signals): `user`, `isAuthenticated`, `login()`, `register()`, `logout()`. Um timer faz logout automático na
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
  `p-drawer` no mobile. O menu é montado a partir de uma lista de itens com chave i18n, ícone e rota.
- **Responsividade:** desktop é o uso principal, mas tudo precisa funcionar no celular. Tabelas com rolagem horizontal e colunas
  secundárias ocultas em telas pequenas; filtros em drawer.
- **Acessibilidade:** regras de acessibilidade do angular-eslint nos templates (seção 8); componentes do PrimeNG já trazem ARIA.

## 7. i18n

### 7.1 Decisão: Transloco (runtime) em vez do i18n nativo do Angular

| Opção | Como funciona | Avaliação |
|---|---|---|
| **Transloco** (escolhida) | Chaves em JSON carregadas em runtime; escopos por feature (lazy) | Troca de idioma sem rebuild, um único build, JSON por feature (como os `messages/<modulo>.properties` do backend), integra com a tradução do PrimeNG |
| `@angular/localize` (nativo) | Textos marcados com `i18n`/`$localize`, extraídos para XLIFF e **compilados por idioma** | Melhor desempenho, mas exige um build e um deploy por idioma e não troca idioma em tempo de execução. Exagero para um app pessoal |
| ngx-translate | Parecido com o Transloco | Funciona, mas o Transloco tem escopos lazy, `transloco-keys-manager` e API mais moderna |

### 7.2 Organização

```
public/i18n/
├── pt-BR.json                     # global: common, menu, validation, enums, errors genéricos
├── accounts/pt-BR.json            # escopo carregado com a rota /accounts
├── categories/pt-BR.json
├── transactions/pt-BR.json
├── credit-cards/pt-BR.json
├── budgets/pt-BR.json
├── investments/pt-BR.json
├── dashboard/pt-BR.json
└── auth/pt-BR.json
```

```json
// public/i18n/pt-BR.json (trecho)
{
  "common": { "new": "Novo", "save": "Salvar", "cancel": "Cancelar", "archive": "Arquivar", "archived": "Arquivado", "clearFilters": "Limpar filtros" },
  "validation": { "required": "Campo obrigatório", "maxlength": "Máximo de {{ requiredLength }} caracteres", "min": "Valor mínimo: {{ min }}" },
  "enums": {
    "accountType": { "CHECKING": "Conta corrente", "SAVINGS": "Poupança", "WALLET": "Carteira", "INVESTMENT": "Investimentos", "OTHER": "Outra" },
    "transactionType": { "INCOME": "Receita", "EXPENSE": "Despesa", "TRANSFER": "Transferência" }
  },
  "errors": { "unexpected": "Erro inesperado. Tente novamente.", "network": "Sem conexão com o servidor.", "sessionExpired": "Sua sessão expirou." }
}
```

```json
// public/i18n/accounts/pt-BR.json
{ "title": "Contas", "fields": { "name": "Nome", "type": "Tipo", "institution": "Instituição", "initialBalance": "Saldo inicial" } }
```

Regras:
- **Chaves em inglês, organizadas por tela/campo**; valores no idioma. Nas features, a chave é prefixada pelo escopo
  (`accounts.fields.name`).
- **Enums traduzidos no front** (`enums.<enum>.<VALOR>`): o backend devolve só o código (`CHECKING`).
- **Mensagens de erro de negócio vêm do backend** (`detail`), não do JSON (seção 5.2).
- **Formatação** de moeda, data e número usa o locale ativo (`LOCALE_ID` + pipes `money`, `localDate`), nunca formatação manual.
- **Componentes do PrimeNG** (datepicker, paginator, confirm, filtros) traduzidos com o pacote `primelocale` (`pt-br.json`) via
  `PrimeNG.setTranslation`, chamado ao trocar de idioma.
- **Novo idioma:** criar os `en.json` de cada pasta, adicionar em `availableLangs` e registrar o locale do Angular. Nenhum
  componente muda.
- `npm run i18n:check` (`transloco-keys-manager find`) quebra o CI com chave usada e não declarada ou chave sobrando.

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

Aliases no `tsconfig.json`: `@core/*`, `@shared/*`, `@features/*`, `@api/*`, `@env/*`. Sem `../../..` entre camadas.

Scripts do `package.json`:

| Script | Comando |
|---|---|
| `start` | `ng serve --proxy-config proxy.conf.json` |
| `build` | `ng build` |
| `test` | `ng test` (Vitest) |
| `lint` | `ng lint` |
| `format` | `prettier --write .` |
| `i18n:check` | `transloco-keys-manager find --emit-error-on-extra-keys` |
| `api:types` | `openapi-typescript http://localhost:8080/v3/api-docs -o src/api/schema.d.ts` |

## 9. Testes

Mesmo critério do backend: **só testes unitários de lógica**, sem testes de componente ou e2e por enquanto.

- **Testar:** `toHttpParams` e helpers de data (incluindo o caso do fuso), `applyServerErrors`, `injectCrudList` (filtro novo volta à
  página 0, leitura/gravação na URL), conversão do `onLazyLoad` em `PageRequest`, `AuthStore` (expiração do token), montagem da árvore
  de categorias, `errorInterceptor` (status → comportamento).
- **Não testar:** templates, telas de CRUD declarativas, componentes do PrimeNG, services que só repassam para o `CrudApi`.
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
| `/login`, `/register` | Login e cadastro | `POST /auth/login`, `POST /auth/register` |
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

- `environment.ts`: `apiUrl: '/api/v1'`, `useMockApi: false`. Em produção, o front é servido no mesmo domínio da API (proxy
  reverso) ou a API passa a liberar o domínio no CORS. **Hoje o backend não tem configuração de CORS**: em dev o proxy resolve;
  para produção é decisão em aberto (seção 15).
- **API mock (fase 0b):** `environment.mock.ts` com `useMockApi: true` e o script `npm run start:mock` (`ng serve
  --configuration mock`). Um `mockApiInterceptor`, registrado só nessa configuração, responde às chamadas `/api/v1/...` com dados
  em memória no mesmo formato da API (`PageResponse`, `ProblemDetail`). O código do mock fica em `src/app/mock/` e não entra no
  build de produção.
- Node LTS compatível com o Angular 21. Criação do projeto:
  `ng new my-finance-web --style=css --routing --ssr=false` (com Tailwind) e depois `ng add angular-eslint`.
- Pacotes: `primeng@^21`, `@primeuix/themes`, `primeicons`, `tailwindcss-primeui`, `primelocale`, `@jsverse/transloco`,
  `ngx-echarts@^21`, `echarts`; dev: `openapi-typescript`, `@jsverse/transloco-keys-manager`, `prettier`,
  `prettier-plugin-tailwindcss`, `eslint-config-prettier`, `husky`, `lint-staged`. Conferir no `npm` as versões compatíveis
  (`peerDependencies`) de cada um com o Angular 21 na instalação.

## 14. Roadmap do frontend

| Fase | Entregas |
|---|---|
| **0a. Fundação** | Projeto Angular 21, lint/Prettier/Husky, Tailwind + PrimeNG com o preset, tema claro/escuro, Transloco + `primelocale`, tipos do OpenAPI, shell |
| **0b. Protótipo com API mock** | Camada de CRUD (seção 4) com testes, interceptors e `ApiError`, `AuthStore`/guards, `mockApiInterceptor` com dados fictícios, telas de login, dashboard, contas, categorias e extrato. **Checkpoint: validação do design antes de integrar** |
| **0c. Integração** | Desligar o mock, rodar contra a API real, cadastro, CI (lint + test + build + i18n:check) |
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
| CRUD | `CrudApi` + `injectCrudList` + `<app-data-table>`/`<app-filter-bar>`/`<app-crud-page>` + `CrudActions`; formulário em diálogo |
| Filtros | Declarativos, nomes iguais aos query params da API, sincronizados com a URL |
| Erros | `ProblemDetail` → `ApiError`; comportamento pelo `code`, texto pelo `detail`; erros de campo aplicados no formulário |
| i18n | Transloco, JSON por feature, só `pt-BR`; mensagens de negócio vêm do backend via `Accept-Language` |
| Tipos da API | `openapi-typescript` (só tipos), services escritos à mão |
| Auth | JWT no `localStorage`, logout na expiração, sem refresh token |
| Lint | angular-eslint + typescript-eslint strict + Prettier + Husky; import só pela API pública da feature |
| Testes | Vitest, só lógica reutilizável |

| Protótipo | Fase 0b com `mockApiInterceptor` próprio (sem MSW nem `angular-in-memory-web-api`), ligado só na configuração `mock` |
| Lookups | Endpoints `/options` com cache no `LookupStore` |

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
