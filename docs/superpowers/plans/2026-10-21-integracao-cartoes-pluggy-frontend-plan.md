# Integração de cartões Pluggy no frontend — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recomendado) ou superpowers:executing-plans para executar tarefa por tarefa. Os passos usam checkbox (`- [ ]`).

**Goal:** mostrar as contas de cartão da Pluggy em `/integrations` (vincular, criar cartão, ignorar, desvincular), e as compras de cartão e as sugestões de pagamento de fatura na fila de `/imports`.

**Architecture:** seção nova `CreditCardLinksComponent` ao lado de `BankAccountsComponent`, com dois diálogos. A fila reaproveita a tela atual, com linhas condicionais por `kind`. Os campos que dependem do backend (`suggestedInvoice`, `importFrom`, `itemId`) são opcionais no frontend: a tela funciona sem eles e melhora quando chegam.

**Tech Stack:** Angular 21 (standalone, signals), PrimeNG 21, Vitest (`ng test`), ESLint (`ng lint`).

**Spec:** `docs/superpowers/specs/2026-10-21-integracao-cartoes-pluggy-frontend-design.md`. Contrato de backend: `../my-finance-api/docs/superpowers/specs/2026-10-21-integracao-cartoes-pluggy-correcoes-design.md`.

## Global Constraints

- Sem commits: o usuário pede commit explicitamente.
- Textos em pt-BR, literais nos templates como nos componentes atuais (`{{ '...' }}`).
- Erros: exibir o `detail` do `ApiError`; não montar textos próprios para erros da API.
- Campos dependentes do backend (`suggestedInvoice`, `importFrom`, `itemId`) são **opcionais** no tipo e tratados como nulos quando ausentes.
- Critério de pronto de cada tarefa: `npm test` e `npm run lint` passam para os arquivos tocados.

---

## Mapa de arquivos

**Criar**
- `src/app/features/integrations/credit-cards/credit-card-links.component.ts` / `.html`
- `src/app/features/integrations/credit-cards/link-credit-card-dialog.component.ts` / `.html`
- `src/app/features/integrations/credit-cards/create-linked-credit-card-dialog.component.ts` / `.html`
- `src/app/features/integrations/data/integration-api.service.spec.ts`
- `src/app/features/imports/data/import-approve.spec.ts` (substitui os casos de `toApproveRequest` no `import.model.spec.ts`)

**Modificar**
- `src/app/features/integrations/data/integration.model.ts`
- `src/app/features/integrations/data/integration-api.service.ts`
- `src/app/features/imports/data/import.model.ts`
- `src/app/features/imports/data/import.model.spec.ts`
- `src/app/shared/data/api-error.ts` (campo `itemId`)
- `src/app/features/imports/imports.page.ts` / `.html`
- `src/app/features/integrations/integrations.page.ts` / `.html`
- `src/app/features/integrations/accounts/bank-accounts.component.ts` / `.html`
- `docs/escopo-frontend.md`

---

### Tarefa 1: Modelos e API de cartões Pluggy

**Files:**
- Modify: `src/app/features/integrations/data/integration.model.ts`
- Modify: `src/app/features/integrations/data/integration-api.service.ts`
- Create: `src/app/features/integrations/data/integration-api.service.spec.ts`

**Interfaces:**
- Produces: `CreditCardLink`, `LinkCreditCardRequest`, `CreateLinkedCreditCardRequest` (modelos); `IntegrationApiService.creditCardLinks()`, `.linkCreditCard(id, body, context?)`, `.createLinkedCreditCard(id, body, context?)`, `.ignoreCreditCard(id)`, `.unlinkCreditCard(id)`.

- [ ] **Passo 1: teste da API (falha)**

```ts
// src/app/features/integrations/data/integration-api.service.spec.ts
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '@env/environment';

import { IntegrationApiService } from './integration-api.service';

describe('IntegrationApiService (cartões)', () => {
  let api: IntegrationApiService;
  let http: HttpTestingController;
  const base = `${environment.apiUrl}/integrations/pluggy/credit-card-links`;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    api = TestBed.inject(IntegrationApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lista as contas de cartão com paginação máxima', () => {
    api.creditCardLinks().subscribe();
    const req = http.expectOne((r) => r.url === base && r.method === 'GET');
    expect(req.request.params.get('size')).toBeTruthy();
    req.flush({ items: [], page: 0, size: 0, totalItems: 0, totalPages: 0 });
  });

  it('vincula com creditCardId e importFrom', () => {
    api.linkCreditCard('l1', { creditCardId: 'c1', importFrom: '2026-10-01' }).subscribe();
    const req = http.expectOne(`${base}/l1/link`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ creditCardId: 'c1', importFrom: '2026-10-01' });
    req.flush({});
  });

  it('cria cartão a partir da conta', () => {
    api.createLinkedCreditCard('l1', { paymentAccountId: 'a1', importFrom: '2026-10-01' }).subscribe();
    const req = http.expectOne(`${base}/l1/create-card`);
    expect(req.request.body).toEqual({ paymentAccountId: 'a1', importFrom: '2026-10-01' });
    req.flush({});
  });

  it('ignora e desvincula com POST', () => {
    api.ignoreCreditCard('l1').subscribe();
    http.expectOne(`${base}/l1/ignore`).flush({});
    api.unlinkCreditCard('l1').subscribe();
    http.expectOne(`${base}/l1/unlink`).flush({});
  });
});
```

- [ ] **Passo 2: rodar e ver falhar**

Run: `npm test -- --include src/app/features/integrations/data/integration-api.service.spec.ts`
Expected: FAIL (métodos e modelos inexistentes).

- [ ] **Passo 3: modelos**

Acrescentar em `integration.model.ts`:

```ts
import type { CreditCardSummary } from '@features/credit-cards/data/credit-card.model';

/** Conta CREDIT da Pluggy (GET /credit-card-links). importFrom e os dias podem faltar (P4 e Pluggy). */
export interface CreditCardLink {
  id: string;
  externalName: string;
  number: string | null;
  status: LinkStatus;
  creditLimit: number | null;
  closingDay: number | null;
  dueDay: number | null;
  creditCard: CreditCardSummary | null;
  /** Pedido P4 ao backend. Ausente até o backend entregar. */
  importFrom?: string | null;
}

export interface LinkCreditCardRequest {
  creditCardId: string;
  importFrom: string;
}

export interface CreateLinkedCreditCardRequest {
  name?: string;
  closingDay?: number;
  dueDay?: number;
  paymentAccountId: string;
  importFrom: string;
}
```

- [ ] **Passo 4: API**

Acrescentar em `integration-api.service.ts` (importar os tipos novos):

```ts
  /** Contas CREDIT da Pluggy, todas (mesma paginação de accounts()). */
  creditCardLinks(): Observable<CreditCardLink[]> {
    return this.http
      .get<PageResponse<CreditCardLink>>(`${this.url}/credit-card-links`, {
        params: toHttpParams({}, { page: 0, size: MAX_PAGE_SIZE }),
      })
      .pipe(map((page) => page.items));
  }

  linkCreditCard(linkId: string, body: LinkCreditCardRequest, context?: HttpContext): Observable<CreditCardLink> {
    return this.http.post<CreditCardLink>(`${this.url}/credit-card-links/${linkId}/link`, body, { context });
  }

  createLinkedCreditCard(
    linkId: string,
    body: CreateLinkedCreditCardRequest,
    context?: HttpContext,
  ): Observable<CreditCardLink> {
    return this.http.post<CreditCardLink>(`${this.url}/credit-card-links/${linkId}/create-card`, body, { context });
  }

  ignoreCreditCard(linkId: string): Observable<CreditCardLink> {
    return this.http.post<CreditCardLink>(`${this.url}/credit-card-links/${linkId}/ignore`, null);
  }

  unlinkCreditCard(linkId: string): Observable<CreditCardLink> {
    return this.http.post<CreditCardLink>(`${this.url}/credit-card-links/${linkId}/unlink`, null);
  }
```

- [ ] **Passo 5: rodar e ver passar**

Run: `npm test -- --include src/app/features/integrations/data/integration-api.service.spec.ts`
Expected: PASS.

---

### Tarefa 2: Fila — modelo, aprovação e erro com item

**Files:**
- Modify: `src/app/features/imports/data/import.model.ts`
- Modify: `src/app/features/imports/data/import.model.spec.ts`
- Modify: `src/app/shared/data/api-error.ts`

**Interfaces:**
- Consumes: `CreditCardSummary` (credit-card.model).
- Produces: `ImportItem` com `kind`, `card`, `installmentNumber`, `installmentTotal`, `suggestedInvoiceId`, `suggestedInvoice?`, `possibleDuplicatePurchase`; `account` anulável; `ApproveItem.asInvoicePayment`; `toApproveRequest(selected, categoryByItem)` que devolve `{ request, withoutCategory }`, com sugestão de pagamento sem categoria; `ApiError.itemId: string | null`.

- [ ] **Passo 1: testes do contrato de aprovação (falham)**

Substituir os casos de `toApproveRequest` por `src/app/features/imports/data/import-approve.spec.ts`:

```ts
import type { ImportItem } from './import.model';
import { toApproveRequest } from './import.model';

function item(id: string, overrides: Partial<ImportItem> = {}): ImportItem {
  return {
    id,
    date: '2026-10-10',
    description: `Item ${id}`,
    amount: 10,
    type: 'EXPENSE',
    account: { id: 'acc-1', name: 'Conta', type: 'CHECKING' },
    externalCategoryName: null,
    suggestedCategory: null,
    possibleTransfer: false,
    possibleDuplicate: null,
    status: 'PENDING',
    kind: 'ACCOUNT_TRANSACTION',
    card: null,
    installmentNumber: null,
    installmentTotal: null,
    suggestedInvoiceId: null,
    possibleDuplicatePurchase: false,
    ...overrides,
  };
}

describe('toApproveRequest', () => {
  it('monta a requisição com os itens que têm categoria', () => {
    const categories = new Map([
      ['a', 'cat-1'],
      ['b', 'cat-2'],
    ]);
    const result = toApproveRequest([item('a'), item('b')], categories);
    expect(result.request.items).toEqual([
      { id: 'a', categoryId: 'cat-1' },
      { id: 'b', categoryId: 'cat-2' },
    ]);
    expect(result.withoutCategory).toBe(0);
  });

  it('deixa de fora os itens sem categoria e os conta', () => {
    const result = toApproveRequest([item('a'), item('b'), item('c')], new Map([['a', 'cat-1']]));
    expect(result.request.items).toEqual([{ id: 'a', categoryId: 'cat-1' }]);
    expect(result.withoutCategory).toBe(2);
  });

  it('aprova sugestão de pagamento de fatura sem categoria, com asInvoicePayment', () => {
    const invoice = item('p', { suggestedInvoiceId: 'inv-1' });
    const result = toApproveRequest([invoice], new Map());
    expect(result.request.items).toEqual([{ id: 'p', asInvoicePayment: true }]);
    expect(result.withoutCategory).toBe(0);
  });

  it('compra de cartão sem categoria continua de fora', () => {
    const purchase = item('c', { kind: 'CARD_PURCHASE', account: null, card: { id: 'card-1', name: 'Nubank', brand: null } });
    const result = toApproveRequest([purchase], new Map());
    expect(result.request.items).toEqual([]);
    expect(result.withoutCategory).toBe(1);
  });
});
```

Em `import.model.spec.ts`, remover o `describe('toApproveRequest')` e manter só o que não depende da assinatura (ou apagar o arquivo se ficar vazio).

- [ ] **Passo 2: rodar e ver falhar**

Run: `npm test -- --include src/app/features/imports/data/import-approve.spec.ts`
Expected: FAIL (campos e regra inexistentes).

- [ ] **Passo 3: modelo de importação**

Em `import.model.ts`, trocar `ImportItem` e `ApproveItem`, e a função `toApproveRequest`:

```ts
import type { CreditCardSummary } from '../../credit-cards/data/credit-card.model';

export type ImportKind = 'ACCOUNT_TRANSACTION' | 'CARD_PURCHASE';

/** Fatura que a saída pode pagar (P3 pedido ao backend: opcional até lá). */
export interface SuggestedInvoice {
  id: string;
  creditCard: CreditCardSummary;
  total: number;
  dueDate: string;
}

/** Item da fila de revisão (GET /imports). */
export interface ImportItem {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER';
  /** Nulo em compra de cartão. */
  account: { id: string; name: string; type: string } | null;
  externalCategoryName: string | null;
  suggestedCategory: CategorySummary | null;
  possibleTransfer: boolean;
  /** Só ACCOUNT_TRANSACTION: lançamento parecido já existente. */
  possibleDuplicate: { id: string; description: string; date: string } | null;
  status: ImportStatus;
  kind: ImportKind;
  /** Só CARD_PURCHASE. */
  card: CreditCardSummary | null;
  installmentNumber: number | null;
  installmentTotal: number | null;
  /** Só ACCOUNT_TRANSACTION: saída que pode ser pagamento de fatura. */
  suggestedInvoiceId: string | null;
  /** Pedido P3 ao backend. Ausente até o backend entregar. */
  suggestedInvoice?: SuggestedInvoice | null;
  /** Só CARD_PURCHASE: compra parecida já lançada à mão. */
  possibleDuplicatePurchase: boolean;
}

export interface ApproveItem {
  id: string;
  /** Obrigatório, exceto na sugestão de pagamento (asInvoicePayment). */
  categoryId?: string;
  description?: string;
  /** Aprova a saída como pagamento da fatura sugerida. */
  asInvoicePayment?: boolean;
}
```

E `toApproveRequest`:

```ts
/**
 * Separa a seleção. Sugestão de pagamento de fatura vai com asInvoicePayment e sem categoria (o backend usa a de sistema).
 * Os demais itens vão com a categoria escolhida; os sem categoria ficam de fora e são contados.
 */
export function toApproveRequest(
  selected: readonly ImportItem[],
  categoryByItem: ReadonlyMap<string, string>,
): { request: ApproveRequest; withoutCategory: number } {
  const items: ApproveItem[] = [];
  let withoutCategory = 0;
  for (const item of selected) {
    if (item.kind === 'ACCOUNT_TRANSACTION' && item.suggestedInvoiceId) {
      items.push({ id: item.id, asInvoicePayment: true });
      continue;
    }
    const categoryId = categoryByItem.get(item.id);
    if (categoryId) items.push({ id: item.id, categoryId });
    else withoutCategory++;
  }
  return { request: { items }, withoutCategory };
}
```

- [ ] **Passo 4: `itemId` no erro**

Em `api-error.ts`, adicionar `itemId` ao `ProblemDetail` e ao `ApiError`:

```ts
export interface ProblemDetail {
  status: number;
  title?: string;
  detail: string;
  code: string;
  errors?: FieldError[];
  /** Pedido P5: item que falhou numa aprovação em lote. */
  itemId?: string;
}
```

Na classe `ApiError`, acrescentar o parâmetro opcional `readonly itemId: string | null = null` depois de `fieldErrors`, e em `toApiError`:

```ts
  if (isProblemDetail(body))
    return new ApiError(error.status, body.code, body.detail ?? '', body.errors ?? [], body.itemId ?? null);
```

- [ ] **Passo 5: rodar e ver passar**

Run: `npm test -- --include src/app/features/imports/data/import-approve.spec.ts --include src/app/shared/data/api-error.spec.ts`
Expected: PASS. (Ajustar `api-error.spec.ts` se ele montar `ApiError` com argumentos posicionais; o novo parâmetro é opcional.)

---

### Tarefa 3: Fila — linhas de compra de cartão e de sugestão

**Files:**
- Modify: `src/app/features/imports/imports.page.ts`
- Modify: `src/app/features/imports/imports.page.html`

**Interfaces:**
- Consumes: `ImportItem` (Tarefa 2), `toApproveRequest`, `ApiError.itemId`.
- Produces: `failedItemId` (signal) destacando a linha que falhou no lote.

- [ ] **Passo 1: ajustar a página**

Em `imports.page.ts`:
- Importar `ApiError` de `@shared/data`.
- Adicionar `protected readonly failedItemId = signal<string | null>(null);`.
- Trocar `approve(items)`: remover o `withoutCategory` do filtro de categoria só para sugestão (a função já cuida) e tratar o erro:

```ts
  protected approve(items: readonly ImportItem[]): void {
    const pending = items.filter((item) => item.status === 'PENDING');
    const { request, withoutCategory } = toApproveRequest(pending, this.categoryByItem());
    if (!request.items.length) return;

    const run = (): void => {
      this.failedItemId.set(null);
      this.api.approve(request).subscribe({
        next: ({ approved }) => {
          this.notifier.success(`${approved} ${approved === 1 ? 'lançamento criado' : 'lançamentos criados'}`);
          this.afterChange();
        },
        error: (error: unknown) => {
          // O errorInterceptor já mostrou o detail; aqui só marcamos a linha, se a API disser qual é.
          if (error instanceof ApiError) this.failedItemId.set(error.itemId);
        },
      });
    };
    if (!withoutCategory) return run();

    this.confirmation.confirm({
      header: 'Aprovar',
      message: `${withoutCategory} ${withoutCategory === 1 ? 'item ficará' : 'itens ficarão'} de fora por não ter categoria. Aprovar os demais?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Aprovar',
      rejectLabel: 'Cancelar',
      rejectButtonProps: { severity: 'secondary', text: true },
      accept: run,
    });
  }
```

Observação: o `errorInterceptor` já trata o erro e o `subscribe({ error })` só recebe o `ApiError` normalizado se o interceptor o relançar. Conferir `error.interceptor.ts` antes de confiar nesse ponto; se ele engolir o erro, o `error` aqui é `HttpErrorResponse`, e o destaque deve ler `itemId` de `error.error` (ver `toApiError`).

- [ ] **Passo 2: linhas condicionais**

Em `imports.page.html`:
- Descrição: abaixo do nome, mostrar para `CARD_PURCHASE` a etiqueta de parcela (`item.installmentTotal > 1`) e "Parecida com compra lançada à mão" (`item.possibleDuplicatePurchase`).
- Para `ACCOUNT_TRANSACTION` com `suggestedInvoiceId`: etiqueta "Possível pagamento de fatura" + `item.suggestedInvoice?.creditCard?.name` quando houver.
- Coluna "Conta": `{{ item.card?.name ?? item.account?.name ?? '' }}`.
- Coluna "Categoria": se é sugestão de pagamento e está pendente, texto "Pagamento de fatura" em vez do `p-select`.
- Botão aprovar: `[disabled]="!isApprovable(item)"`, onde `isApprovable` aceita categoria ou sugestão de pagamento.
- Linha destacada: `[class.bg-red-500/10]="item.id === failedItemId()"` no `<tr>`.

Trechos a inserir (no lugar da coluna de conta, descrição e botão de aprovar):

```html
<!-- Coluna Conta -->
<td class="hidden md:table-cell">{{ item.card?.name ?? item.account?.name ?? '' }}</td>

<!-- Descrição: sinais extras -->
@if (item.kind === 'CARD_PURCHASE' && item.installmentTotal && item.installmentTotal > 1) {
  <span class="text-muted-color">{{ 'Parcela' }} {{ item.installmentNumber }}/{{ item.installmentTotal }}</span>
}
@if (item.kind === 'CARD_PURCHASE' && item.possibleDuplicatePurchase) {
  <span class="text-warn"><i class="pi pi-clone"></i> {{ 'Parecida com compra lançada à mão' }}</span>
}
@if (item.suggestedInvoiceId) {
  <span class="text-primary">
    <i class="pi pi-credit-card"></i> {{ 'Possível pagamento de fatura' }}
    @if (item.suggestedInvoice; as invoice) {
      {{ 'de' }} {{ invoice.creditCard.name }}
    }
  </span>
}
```

```ts
// imports.page.ts
protected isInvoicePayment(item: ImportItem): boolean {
  return item.kind === 'ACCOUNT_TRANSACTION' && !!item.suggestedInvoiceId;
}

protected isApprovable(item: ImportItem): boolean {
  return this.isInvoicePayment(item) || !!this.categoryFor(item);
}
```

Coluna de categoria, para a sugestão de pagamento:

```html
@if (item.status === 'PENDING' && isInvoicePayment(item)) {
  <span class="text-muted-color">{{ 'Pagamento de fatura' }}</span>
} @else if (item.status === 'PENDING') {
  <!-- p-select existente -->
}
```

Ação de aprovar, usando `isApprovable(item)` no `[disabled]`.

- [ ] **Passo 3: verificação**

Run: `npm run lint` e `npm test`.
Expected: PASS. Build de template: `npm run build` (erros de template aparecem aqui).

---

### Tarefa 4: Seção "Cartões do banco"

**Files:**
- Create: `src/app/features/integrations/credit-cards/credit-card-links.component.ts` / `.html`
- Modify: `src/app/features/integrations/integrations.page.ts` / `.html`
- Modify: `src/app/features/integrations/accounts/bank-accounts.component.ts` / `.html`

**Interfaces:**
- Consumes: `IntegrationApiService.creditCardLinks/ignoreCreditCard/unlinkCreditCard` (Tarefa 1); `LinkCreditCardDialogComponent` e `CreateLinkedCreditCardDialogComponent` (Tarefa 5).
- Produces: `CreditCardLinksComponent.reload()` (público), chamado por `reloadAll()`.

- [ ] **Passo 1: componente**

`credit-card-links.component.ts`:

```ts
import { CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ImportCountStore } from '@features/imports';
import { CrudActionsService } from '@shared/crud/page';
import { EmptyStateComponent, NotifierService } from '@shared/ui';
import { ConfirmationService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { Tag } from 'primeng/tag';

import { IntegrationApiService } from '../data/integration-api.service';
import type { CreditCardLink, LinkStatus } from '../data/integration.model';
import { CreateLinkedCreditCardDialogComponent } from './create-linked-credit-card-dialog.component';
import { LinkCreditCardDialogComponent } from './link-credit-card-dialog.component';

const STATUS_LABELS: Record<LinkStatus, string> = {
  PENDING: 'Novo cartão encontrado',
  LINKED: 'Vinculado',
  IGNORED: 'Ignorado',
  UNSUPPORTED: 'Tipo ainda não suportado',
};

/** Contas de cartão encontradas nos bancos. Vincula a um cartão existente, cria um cartão novo ou ignora. */
@Component({
  selector: 'app-credit-card-links',
  imports: [CurrencyPipe, DatePipe, RouterLink, EmptyStateComponent, Button, Card, Tag],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './credit-card-links.component.html',
})
export class CreditCardLinksComponent {
  private readonly api = inject(IntegrationApiService);
  private readonly crud = inject(CrudActionsService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly notifier = inject(NotifierService);
  private readonly count = inject(ImportCountStore);

  protected readonly loaded = signal(false);
  protected readonly links = signal<CreditCardLink[]>([]);

  constructor() {
    this.reload();
  }

  reload(): void {
    this.api.creditCardLinks().subscribe((links) => {
      this.links.set(links);
      this.loaded.set(true);
    });
  }

  protected statusLabel(status: LinkStatus): string {
    return STATUS_LABELS[status];
  }

  protected statusSeverity(status: LinkStatus): 'info' | 'success' | 'secondary' {
    if (status === 'PENDING') return 'info';
    if (status === 'LINKED') return 'success';
    return 'secondary';
  }

  /** Dias faltando na conta: o cadastro do cartão vai precisar deles. */
  protected missingDays(link: CreditCardLink): boolean {
    return link.closingDay == null || link.dueDay == null;
  }

  protected linkCard(link: CreditCardLink): void {
    this.crud
      .openForm(LinkCreditCardDialogComponent, 'Vincular cartão', { link })
      .subscribe((saved) => saved && this.changed());
  }

  protected createCard(link: CreditCardLink): void {
    this.crud
      .openForm(CreateLinkedCreditCardDialogComponent, 'Criar cartão', { link })
      .subscribe((saved) => saved && this.changed());
  }

  protected ignore(link: CreditCardLink): void {
    this.api.ignoreCreditCard(link.id).subscribe(() => {
      this.notifier.success('Cartão ignorado');
      this.changed();
    });
  }

  protected unlink(link: CreditCardLink): void {
    this.confirmation.confirm({
      header: 'Desvincular',
      message: `Desvincular "${link.externalName}"? As compras já importadas continuam no cartão e na fila, sem aprovação.`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Desvincular',
      rejectLabel: 'Cancelar',
      rejectButtonProps: { severity: 'secondary', text: true },
      accept: () =>
        this.api.unlinkCreditCard(link.id).subscribe(() => {
          this.notifier.success('Cartão desvinculado');
          this.changed();
        }),
    });
  }

  private changed(): void {
    this.reload();
    this.count.refresh();
  }
}
```

- [ ] **Passo 2: template**

`credit-card-links.component.html`:

```html
<p-card>
  <header class="mb-3 flex flex-col">
    <h2 class="m-0 text-lg font-semibold">{{ 'Cartões do banco' }}</h2>
    <span class="text-sm text-muted-color">
      {{ 'Cartões de crédito encontrados nos bancos. Vincule a um cartão existente ou crie um novo.' }}
    </span>
  </header>

  @if (loaded() && !links().length) {
    <app-empty-state message="Nenhum cartão encontrado. Sincronize um banco para buscar os cartões." />
  }

  <ul class="m-0 flex list-none flex-col gap-2 p-0">
    @for (link of links(); track link.id) {
      <li class="rounded-border border border-surface p-3" [class.opacity-60]="link.status === 'IGNORED'">
        <div class="flex flex-wrap items-start justify-between gap-2">
          <div class="flex flex-col gap-1">
            <span class="flex flex-wrap items-center gap-2">
              <span class="font-medium">{{ link.externalName }}</span>
              @if (link.number) {
                <span class="text-sm text-muted-color">{{ link.number }}</span>
              }
              <p-tag [severity]="statusSeverity(link.status)" [value]="statusLabel(link.status)" />
            </span>

            @if (link.creditLimit != null) {
              <span class="text-sm text-muted-color">{{ 'Limite' }}: {{ link.creditLimit | currency }}</span>
            }

            @if (link.status === 'LINKED' && link.creditCard) {
              <span class="text-sm">
                {{ 'Cartão do MyFinance' }}:
                <a class="text-primary" [routerLink]="['/credit-cards', link.creditCard.id]">
                  <strong>{{ link.creditCard.name }}</strong>
                </a>
                @if (link.importFrom) {
                  · {{ 'importa desde' }} {{ link.importFrom | date: 'dd/MM/yyyy' }}
                }
              </span>
            }

            @if (link.status !== 'LINKED' && missingDays(link)) {
              <span class="text-sm text-muted-color">
                {{ 'A instituição não informou os dias de fechamento e vencimento: informe-os ao criar o cartão.' }}
              </span>
            }
          </div>

          <div class="flex flex-wrap gap-2">
            @if (link.status === 'PENDING' || link.status === 'IGNORED') {
              <p-button size="small" icon="pi pi-link" [label]="'Vincular'" (onClick)="linkCard(link)" />
              <p-button
                size="small"
                severity="secondary"
                icon="pi pi-plus"
                [label]="'Criar cartão'"
                (onClick)="createCard(link)"
              />
            }
            @if (link.status === 'PENDING') {
              <p-button size="small" severity="secondary" [text]="true" [label]="'Ignorar'" (onClick)="ignore(link)" />
            }
            @if (link.status === 'LINKED') {
              <p-button
                size="small"
                severity="secondary"
                [text]="true"
                [label]="'Desvincular'"
                (onClick)="unlink(link)"
              />
            }
          </div>
        </div>
      </li>
    }
  </ul>
</p-card>
```

- [ ] **Passo 3: integrar na página**

Em `integrations.page.html`, logo depois de `<app-bank-accounts />`:

```html
    <app-credit-card-links />
```

Em `integrations.page.ts`:
- Importar `CreditCardLinksComponent` e adicionar aos `imports`.
- `viewChild(CreditCardLinksComponent)` como `creditCards` e, em `reloadAll()`, chamar `this.creditCards()?.reload();`.
- Em `OPERATION_LABELS`, acrescentar `CARD_LINK: 'Cartão vinculado'`.

Em `bank-accounts.component.html`, trocar o texto do ramo `UNSUPPORTED`:

```html
                @if (link.status === 'UNSUPPORTED') {
                  <span class="text-sm text-muted-color">{{ 'Tipo de conta ainda não suportado.' }}</span>
                }
```

Em `bank-accounts.component.ts`, trocar `UNSUPPORTED: 'Cartão: em breve'` por `UNSUPPORTED: 'Tipo ainda não suportado'`.

- [ ] **Passo 4: verificação**

Run: `npm run lint` e `npm run build`. Expected: PASS.

---

### Tarefa 5: Diálogos de vincular e de criar cartão

**Files:**
- Create: `src/app/features/integrations/credit-cards/link-credit-card-dialog.component.ts` / `.html`
- Create: `src/app/features/integrations/credit-cards/create-linked-credit-card-dialog.component.ts` / `.html`

**Interfaces:**
- Consumes: `IntegrationApiService.linkCreditCard/createLinkedCreditCard` (Tarefa 1); `CreditCardApiService.options`; `AccountLookupService`, `toAccountOptions`.
- Produces: diálogos que fecham com `true` em sucesso (contrato de `CrudActionsService.openForm`).

- [ ] **Passo 1: vincular**

`link-credit-card-dialog.component.ts`:

```ts
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CreditCardApiService } from '@features/credit-cards/data/credit-card-api.service';
import type { CreditCardSummary } from '@features/credit-cards/data/credit-card.model';
import { FieldComponent, FormFooterComponent, injectFormSubmit } from '@shared/forms';
import { MAX_PAGE_SIZE, toLocalDate } from '@shared/data';
import { NotifierService } from '@shared/ui';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { DatePicker } from 'primeng/datepicker';
import { Select } from 'primeng/select';

import { IntegrationApiService } from '../data/integration-api.service';
import { importFromRange } from '../data/import-from';
import type { CreditCardLink } from '../data/integration.model';

/** Vincula a conta de cartão da Pluggy a um cartão existente do MyFinance, a partir de uma data de corte. */
@Component({
  selector: 'app-link-credit-card-dialog',
  imports: [ReactiveFormsModule, FieldComponent, FormFooterComponent, DatePicker, Select],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './link-credit-card-dialog.component.html',
})
export class LinkCreditCardDialogComponent {
  private readonly api = inject(IntegrationApiService);
  private readonly cards = inject(CreditCardApiService);
  private readonly notifier = inject(NotifierService);
  protected readonly ref = inject(DynamicDialogRef);
  protected readonly link = (inject(DynamicDialogConfig).data as { link: CreditCardLink }).link;

  private readonly activeCards = signal<CreditCardSummary[]>([]);
  protected readonly cardOptions = computed(() =>
    this.activeCards().map((card) => ({ value: card.id, label: card.name })),
  );
  protected readonly range = importFromRange(new Date());

  protected readonly form = inject(NonNullableFormBuilder).group({
    creditCardId: ['', Validators.required],
    importFrom: [new Date(), Validators.required],
  });

  protected readonly submit = injectFormSubmit(
    this.form,
    (value, context) =>
      this.api.linkCreditCard(
        this.link.id,
        { creditCardId: value.creditCardId, importFrom: toLocalDate(value.importFrom) },
        context,
      ),
    (linked) => {
      this.notifier.success(`Cartão vinculado · ${linked.creditCard?.name ?? ''}`.trim());
      this.ref.close(true);
    },
  );

  constructor() {
    // Cartões ativos (o backend recusa arquivados). Não filtramos os já vinculados: o backend responde o erro.
    this.cards
      .options({ archived: false }, { page: 0, size: MAX_PAGE_SIZE })
      .subscribe((page) => this.activeCards.set(page.items));
  }
}
```

`link-credit-card-dialog.component.html`:

```html
<form [formGroup]="form" (ngSubmit)="submit.submit()" class="flex flex-col gap-4">
  <app-field label="Cartão do MyFinance" fieldId="link-card" [control]="form.controls.creditCardId">
    <p-select
      inputId="link-card"
      formControlName="creditCardId"
      [options]="cardOptions()"
      optionLabel="label"
      optionValue="value"
      appendTo="body"
    />
  </app-field>

  <app-field label="Importar compras desde" fieldId="link-card-import-from" [control]="form.controls.importFrom">
    <p-datepicker
      inputId="link-card-import-from"
      formControlName="importFrom"
      dateFormat="dd/mm/yy"
      [minDate]="range.min"
      [maxDate]="range.max"
      appendTo="body"
    />
  </app-field>

  <p class="m-0 text-sm text-muted-color">
    {{ 'Compras de faturas anteriores a essa data não entram na fila.' }}
  </p>

  <app-form-footer [submit]="submit" (cancelled)="ref.close(false)" />
</form>
```

- [ ] **Passo 2: criar cartão**

`create-linked-credit-card-dialog.component.ts`:

```ts
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AccountLookupService, toAccountOptions } from '@features/accounts';
import { FieldComponent, FormFooterComponent, injectFormSubmit } from '@shared/forms';
import { toLocalDate } from '@shared/data';
import { NotifierService } from '@shared/ui';
import { DatePicker } from 'primeng/datepicker';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { InputNumber } from 'primeng/inputnumber';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { computed } from '@angular/core';

import { IntegrationApiService } from '../data/integration-api.service';
import { importFromRange } from '../data/import-from';
import type { CreditCardLink } from '../data/integration.model';

/** Cria um cartão do MyFinance a partir da conta de cartão da Pluggy. Dias aparecem só quando faltam na conta. */
@Component({
  selector: 'app-create-linked-credit-card-dialog',
  imports: [ReactiveFormsModule, FieldComponent, FormFooterComponent, DatePicker, InputNumber, InputText, Select],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './create-linked-credit-card-dialog.component.html',
})
export class CreateLinkedCreditCardDialogComponent {
  private readonly api = inject(IntegrationApiService);
  private readonly notifier = inject(NotifierService);
  private readonly lookup = inject(AccountLookupService);
  protected readonly ref = inject(DynamicDialogRef);
  protected readonly link = (inject(DynamicDialogConfig).data as { link: CreditCardLink }).link;

  protected readonly accountOptions = computed(() => toAccountOptions(this.lookup.items()));
  protected readonly range = importFromRange(new Date());
  protected readonly askClosingDay = this.link.closingDay == null;
  protected readonly askDueDay = this.link.dueDay == null;

  protected readonly form = inject(NonNullableFormBuilder).group({
    name: ['', [Validators.maxLength(100)]],
    closingDay: [this.link.closingDay ?? (null as number | null), this.askClosingDay ? Validators.required : []],
    dueDay: [this.link.dueDay ?? (null as number | null), this.askDueDay ? Validators.required : []],
    paymentAccountId: ['', Validators.required],
    importFrom: [new Date(), Validators.required],
  });

  protected readonly submit = injectFormSubmit(
    this.form,
    (value, context) =>
      this.api.createLinkedCreditCard(
        this.link.id,
        {
          name: value.name.trim() || undefined,
          closingDay: this.askClosingDay ? (value.closingDay ?? undefined) : undefined,
          dueDay: this.askDueDay ? (value.dueDay ?? undefined) : undefined,
          paymentAccountId: value.paymentAccountId,
          importFrom: toLocalDate(value.importFrom),
        },
        context,
      ),
    (created) => {
      this.notifier.success(`Cartão criado · ${created.creditCard?.name ?? ''}`.trim());
      this.ref.close(true);
    },
  );

  constructor() {
    this.lookup.ensureLoaded();
  }
}
```

`create-linked-credit-card-dialog.component.html`:

```html
<form [formGroup]="form" (ngSubmit)="submit.submit()" class="flex flex-col gap-4">
  <app-field label="Nome" fieldId="create-card-name" [control]="form.controls.name">
    <input pInputText id="create-card-name" formControlName="name" [placeholder]="link.externalName" class="w-full" />
  </app-field>

  @if (askClosingDay) {
    <app-field label="Dia de fechamento" fieldId="create-card-closing" [control]="form.controls.closingDay">
      <p-inputnumber inputId="create-card-closing" formControlName="closingDay" [min]="1" [max]="31" />
    </app-field>
  }

  @if (askDueDay) {
    <app-field label="Dia de vencimento" fieldId="create-card-due" [control]="form.controls.dueDay">
      <p-inputnumber inputId="create-card-due" formControlName="dueDay" [min]="1" [max]="31" />
    </app-field>
  }

  <app-field label="Conta que paga a fatura" fieldId="create-card-account" [control]="form.controls.paymentAccountId">
    <p-select
      inputId="create-card-account"
      formControlName="paymentAccountId"
      [options]="accountOptions()"
      optionLabel="label"
      optionValue="value"
      appendTo="body"
    />
  </app-field>

  <app-field label="Importar compras desde" fieldId="create-card-import-from" [control]="form.controls.importFrom">
    <p-datepicker
      inputId="create-card-import-from"
      formControlName="importFrom"
      dateFormat="dd/mm/yy"
      [minDate]="range.min"
      [maxDate]="range.max"
      appendTo="body"
    />
  </app-field>

  <app-form-footer [submit]="submit" (cancelled)="ref.close(false)" />
</form>
```

Nota: o `ReactiveFormsModule` cobre `pInputText` com `formControlName`; se o `InputText` não aplicar, trocar por `<input pInputText ...>` com o import já presente.

- [ ] **Passo 3: verificação**

Run: `npm run lint`, `npm run build`. Expected: PASS. Conferir também o `importFromRange`: ele recebe `Date` e devolve `{ min, max }`, como em `link-account-dialog`.

---

### Tarefa 6: Documentação e verificação final

**Files:**
- Modify: `docs/escopo-frontend.md` (tabela de rotas de `/integrations`, linha ~818)

- [ ] **Passo 1:** acrescentar à linha de `/integrations` os endpoints `/integrations/pluggy/credit-card-links`, `/integrations/pluggy/credit-card-links/{linkId}/link`, `.../create-card`, `.../ignore`, `.../unlink`, e à descrição "cartões do banco (vincular, criar, ignorar, desvincular)".

- [ ] **Passo 2:** `npm run lint`, `npm test`, `npm run build`. Expected: tudo PASS.

- [ ] **Passo 3:** não commitar; informar o usuário dos arquivos alterados.
