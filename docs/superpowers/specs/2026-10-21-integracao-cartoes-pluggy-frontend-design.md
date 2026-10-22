# Integração de cartões de crédito com a Pluggy — Design (frontend)

> 21/10/2026 · Status: **rascunho revisado** (premissas validadas no backend em 21/10/2026) · Escopo alvo: v0.11
>
> Contraparte do `my-finance-api/docs/superpowers/specs/2026-10-21-integracao-cartoes-pluggy-design.md` (backend, aprovado). Este
> documento define como a tela e a fila consomem os endpoints `credit-card-links` e os novos tipos de item da fila. Quando uma
> regra importa para a tela, aparece aqui com referência à spec do backend.

## Problema

O backend já traz as contas `CREDIT` da Pluggy para dentro dos cartões do MyFinance (vínculo, criação de cartão, fila de compras e
sugestão de pagamento de fatura). Hoje o frontend não tem tela para isso: a seção "Contas do banco" não mostra cartões, e a fila de
importações só conhece lançamentos de conta.

Precisamos: uma seção para vincular ou criar cartão a partir das contas `CREDIT`; mostrar as compras de cartão e as sugestões de
pagamento na fila de importações, com ações próprias; e exibir os erros novos.

## Validação das premissas no backend

Cada premissa foi conferida no código do backend (working tree, ainda não commitado).

| Premissa | Resultado | Evidência |
|---|---|---|
| P1. `account` é nulo em `CARD_PURCHASE` | **Confirmada** | `ImportItemResponseAssembler`: `accountId = isCard ? null : internalId`; `account` fica nulo |
| P2. Aprovar sugestão sem `categoryId` | **Confirmada, com um campo novo** | `ApproveImportItem.asInvoicePayment`; `approve` só usa o pagamento de fatura se `asInvoicePayment == true` e houver `suggestedInvoiceId`. Sem o flag, a categoria é exigida (`CATEGORY_REQUIRED`) |
| P3. Fila traz só `suggestedInvoiceId` | **Lacuna confirmada** | `ImportItemResponse` não tem o cartão da fatura sugerida. Pedido ao backend (ver abaixo) |
| P4. `importFrom` não vem na resposta do vínculo | **Lacuna confirmada** | `CreditCardLinkResponse` não tem `importFrom`. `IntegrationLink` guarda o campo; falta expô-lo |
| P5. Erro de lote não aponta o item | **Lacuna confirmada** | `ProblemDetail` só tem `code` e `detail`. O `detail` de `CATEGORY_REQUIRED` traz a descrição, não o id |
| P6. Formato dos códigos | **Confirmada, com correções** | `code` é `módulo.NOME` (`ErrorCode.code()`). Ver tabela da §5 |
| P7. `GET /accounts` não devolve `CREDIT` | **Confirmada** | `ListAccountLinksUseCase` filtra `LinkType.ACCOUNT`; `IntegrationSyncWriter` grava `CREDIT` como `CREDIT_CARD` |

Correções que a validação trouxe:
- O erro de invoice fechada é `creditcard.INVOICE_CLOSED`, não `CREDIT_CARD_INVOICE_CLOSED`.
- `UNSUPPORTED` ainda existe para contas que não são `BANK` nem `CREDIT` (tipo `OTHER`). Por isso o ramo de `UNSUPPORTED` em
  `bank-accounts` **continua**; só o texto muda (ver §1).
- O frontend já exibe o `detail` que vem da API (`ApiError.detail`, convenção de `shared/data/api-error.ts`). Por isso a tela usa
  o texto do backend, sem montar mensagens próprias (ver §5).

### Pedidos ao backend (antes da implementação)

1. **P2 — flag de pagamento de fatura.** Já existe: o frontend envia `asInvoicePayment: true` no item sugerido.
2. **P3 — resumo da fatura na fila.** Acrescentar `suggestedInvoice: { id, creditCard: CreditCardSummary, total, dueDate }` em
   `ImportItemResponse`, no lugar de só `suggestedInvoiceId`.
3. **P4 — data de corte no vínculo.** Acrescentar `importFrom` em `CreditCardLinkResponse`.
4. **P5 — item que falhou no lote.** Acrescentar o id do item ao erro de aprovação em lote (ex.: `ProblemDetail` com
   propriedade `itemId`). Hoje a tela não consegue destacar a linha.

## Decisões

| Tema | Decisão | Motivo |
|---|---|---|
| Onde fica | Nova seção **"Cartões do banco"** em `/integrations`, ao lado de "Contas do banco", no mesmo padrão (`p-card`, agrupada por banco) | Segue a organização atual; sem rota nova |
| Componentes | `CreditCardLinksComponent` (lista), `LinkCreditCardDialogComponent` (vincular), `CreateLinkedCreditCardDialogComponent` (criar cartão) | Espelha `bank-accounts` e seus diálogos |
| Diálogo vs. página | Diálogos | Escopo §"Diálogo vs. página" |
| Fila | Compras de cartão e sugestões entram na **mesma** tela `/imports`, com linha própria por tipo | Evita uma segunda fila; a contagem do menu já cobre tudo |
| Sugestão de pagamento | Sem seletor de categoria; envia `asInvoicePayment: true` | Backend usa a categoria de sistema "Pagamento de fatura" |
| Filtro da fila por cartão | Fora desta versão | `ImportItemFilter` só tem `accountLinkId` |
| Pluggy widget | Sem mudança | Cartões chegam pela mesma conexão já sincronizada |

## Contrato consumido

Endpoints novos, sob `/api/v1/integrations/{provider}/credit-card-links`:

| Método | Caminho | Corpo | Resposta |
|---|---|---|---|
| GET | `/credit-card-links` | — (paginado; o frontend pede `MAX_PAGE_SIZE`, como em `accounts()`) | `PageResponse<CreditCardLink>` |
| POST | `/credit-card-links/{linkId}/link` | `LinkCreditCardRequest` | `CreditCardLink` |
| POST | `/credit-card-links/{linkId}/create-card` | `CreateLinkedCreditCardRequest` | `CreditCardLink` |
| POST | `/credit-card-links/{linkId}/ignore` | — | `CreditCardLink` |
| POST | `/credit-card-links/{linkId}/unlink` | — | `CreditCardLink` |

Modelos (acrescentar em `features/integrations/data/integration.model.ts`):

```ts
/** Conta CREDIT da Pluggy (GET /credit-card-links). creditCard é nulo sem vínculo. */
export interface CreditCardLink {
  id: string;
  externalName: string;
  number: string | null;
  status: LinkStatus;            // PENDING | LINKED | IGNORED (CREDIT nunca vira UNSUPPORTED)
  creditLimit: number | null;
  /** Nulos quando a instituição não informa; create-card então exige os dias. */
  closingDay: number | null;
  dueDay: number | null;
  creditCard: CreditCardSummary | null;
  /** Pedido P4: data de corte do vínculo. Null enquanto não vinculado. */
  importFrom: string | null;
}

export interface LinkCreditCardRequest {
  creditCardId: string;
  importFrom: string;            // yyyy-MM-dd
}

export interface CreateLinkedCreditCardRequest {
  name?: string;                 // omitido = nome da Pluggy
  closingDay?: number;           // 1–31; obrigatório se a Pluggy não informou
  dueDay?: number;               // 1–31; obrigatório se a Pluggy não informou
  paymentAccountId: string;
  importFrom: string;
}
```

`LinkStatus` e `CreditCardSummary` já existem e não mudam.

Métodos novos em `IntegrationApiService`: `creditCardLinks()` (mesma paginação de `accounts()`), `linkCreditCard`,
`createLinkedCreditCard`, `ignoreCreditCard`, `unlinkCreditCard`.

### Fila de importações

`ImportItem` (em `features/imports/data/import.model.ts`) ganha os campos que o backend já devolve em `ImportItemResponse`:

```ts
export type ImportKind = 'ACCOUNT_TRANSACTION' | 'CARD_PURCHASE';

export interface ImportItem {
  // ...campos atuais...
  account: { id: string; name: string; type: string } | null; // null em CARD_PURCHASE (P1 confirmada)
  kind: ImportKind;
  card: CreditCardSummary | null;                             // preenchido em CARD_PURCHASE
  installmentNumber: number | null;
  installmentTotal: number | null;
  /** Só ACCOUNT_TRANSACTION: fatura que a saída pode pagar. Ver P3 para o resumo. */
  suggestedInvoiceId: string | null;
  /** Só CARD_PURCHASE: compra parecida já lançada à mão no cartão. */
  possibleDuplicatePurchase: boolean;
}

export interface ApproveItem {
  id: string;
  /** Obrigatório, exceto na sugestão de pagamento (asInvoicePayment = true). */
  categoryId?: string;
  description?: string;
  /** true aprova a saída como pagamento da fatura sugerida (P2). */
  asInvoicePayment?: boolean;
}
```

`possibleDuplicate` (lançamento de conta) continua valendo para `ACCOUNT_TRANSACTION`. Em `CARD_PURCHASE` ele vem nulo e o aviso
usa `possibleDuplicatePurchase`. Confirmado no backend: o assembler só calcula duplicata quando há conta.

## 1. Seção "Cartões do banco"

Componente `CreditCardLinksComponent`, em `features/integrations/credit-cards/`. Mesmo esqueleto de `BankAccountsComponent`:
`p-card`, cabeçalho, lista agrupada por conexão, estado vazio e método público `reload()` chamado por `reloadAll()` em
`integrations.page.ts`.

Cada conta mostra:
- Nome da Pluggy (`externalName`), final do número (`number`) e etiqueta de status.
- Limite (`creditLimit`) quando vier.
- Se vinculada: "Cartão do MyFinance: **<nome>**" (link para `/credit-cards/:id`) e "importa desde <data>" (P4).
- Se faltarem dias e a conta não estiver vinculada: "A instituição não informou os dias de fechamento e vencimento: informe-os ao
  criar o cartão."

| Status | Etiqueta | Ações |
|---|---|---|
| `PENDING` | "Novo cartão encontrado" (info) | **Vincular**, **Criar cartão**, **Ignorar** (texto) |
| `IGNORED` | "Ignorado" (secondary) | **Vincular**, **Criar cartão** |
| `LINKED` | "Vinculado" (success) | **Desvincular** (texto), com confirmação |

Regras:
- Desvincular pede confirmação (`ConfirmationService`). O texto diz que as compras já importadas continuam no cartão e na fila, sem
  aprovação (spec do backend §2).
- Ignorar não pede confirmação (mesmo padrão de conta).
- Depois de qualquer ação: recarregar a seção e `ImportCountStore.refresh()`.

**Ajuste em `bank-accounts`:** o ramo `UNSUPPORTED` continua, porque ainda existe para contas `OTHER`. O texto
"Cartão: em breve" / "Contas de cartão ainda não são importadas." deixa de ser verdadeiro e vira "Tipo de conta ainda não
suportado."

## 2. Diálogo "Vincular a cartão existente"

`LinkCreditCardDialogComponent`:

| Campo | Controle | Regra |
|---|---|---|
| Cartão do MyFinance | `p-select` com `GET /credit-cards` (ativos) | Obrigatório. Sem arquivados |
| Importar compras desde | `p-datepicker` | Obrigatório. Padrão: hoje |

- Não filtramos cartões já vinculados a outra conta Pluggy: o frontend não tem essa informação. Se o usuário escolher um desses, o
  backend responde `integration.CREDIT_CARD_LINK_ALREADY_LINKED` e o diálogo mostra o `detail`.
- Cartão arquivado é recusado pelo backend (`creditcard.CREDIT_CARD_ARCHIVED`, via `getActiveId`). Sem filtro na lista, o
  erro aparece no `detail`.
- Sucesso: fecha com `true`; a seção recarrega.

## 3. Diálogo "Criar cartão"

`CreateLinkedCreditCardDialogComponent`:

| Campo | Controle | Regra |
|---|---|---|
| Nome | `input` | Opcional; vazio = nome da Pluggy. Máximo 100 |
| Dia de fechamento | `p-inputnumber` (1–31) | **Só aparece se `closingDay` da conta for nulo**; obrigatório nesse caso |
| Dia de vencimento | `p-inputnumber` (1–31) | **Só aparece se `dueDay` da conta for nulo**; obrigatório nesse caso |
| Conta que paga a fatura | `p-select` com `GET /accounts/options` | Obrigatório. Pré-seleciona a conta do MyFinance vinculada à conta bancária da Pluggy, se houver |
| Importar compras desde | `p-datepicker` | Obrigatório. Padrão: hoje |

- Limite e nome vêm da Pluggy; o usuário altera depois pela tela do cartão.
- Se faltar dia e o usuário não informar, o backend responde `creditcard.CREDIT_CARD_DAYS_REQUIRED`; o `detail` aparece no diálogo.
- Sucesso: fecha com `true`.

## 4. Fila de importações (`/imports`)

A fila passa a mostrar dois tipos de linha. Seleção, aprovação em lote e ignorar seguem a mesma lógica.

**Compra de cartão (`CARD_PURCHASE`):**
- Descrição, data, valor e o cartão (`card.name`) no lugar da conta.
- Se `installmentTotal > 1`: "Parcela {installmentNumber}/{installmentTotal}".
- Se `possibleDuplicatePurchase`: "Parecida com compra lançada à mão". Não bloqueia.
- Categoria obrigatória para aprovar. Usa a sugestão quando houver.

**Sugestão de pagamento de fatura (`ACCOUNT_TRANSACTION` com `suggestedInvoiceId`):**
- Etiqueta "Possível pagamento de fatura" + nome do cartão (depende de P3; sem P3, mostra só a etiqueta e o valor).
- Sem seletor de categoria. Aprovar envia `asInvoicePayment: true` e sem `categoryId`.
- Ignorar mantém o item como saída comum. Nesse caso, a categoria volta a ser obrigatória; a tela só reconhece isso ao recarregar.

**Erro na aprovação em lote:** a API é tudo ou nada. A linha que falhou só pode ser destacada com P5. Até lá, a tela mostra o `detail`
do erro e mantém a seleção.

**Filtros:** a barra atual não muda.

## 5. Erros

A tela usa o `detail` que vem da API (`ApiError.detail`) e só trata o `code` quando precisa de comportamento. Os códigos reais, com
prefixo de módulo:

| Código | Onde ocorre | Mensagem exibida |
|---|---|---|
| `integration.CREDIT_CARD_LINK_ALREADY_LINKED` | Vincular / criar | `detail` do backend |
| `creditcard.CREDIT_CARD_ARCHIVED` | Vincular / criar | `detail` do backend |
| `creditcard.CREDIT_CARD_DAYS_REQUIRED` | Criar | `detail` do backend |
| `creditcard.INVOICE_CLOSED` | Aprovar compra em fatura fechada | `detail` ("A fatura de {mês} já está fechada...") |
| `integration.CATEGORY_REQUIRED` | Aprovar sem categoria | `detail` do backend |
| `integration.IMPORT_ITEM_NOT_PENDING` | Aprovar / ignorar item já tratado | `detail` do backend |

Os textos vêm de `messages/*.properties` do backend, em pt_BR. Nenhum texto novo precisa ser escrito no frontend para os erros.

## 6. Textos e i18n

Os templates usam literais em português dentro de `{{ '...' }}`, como `bank-accounts.component.html`. A seção nova segue o mesmo
padrão. Label de operação em `OPERATION_LABELS` (`integrations.page.ts`): `CARD_LINK: 'Cartão vinculado'`.

## Arquivos

**Criar**
- `src/app/features/integrations/credit-cards/credit-card-links.component.ts` e `.html`
- `src/app/features/integrations/credit-cards/link-credit-card-dialog.component.ts` e `.html`
- `src/app/features/integrations/credit-cards/create-linked-credit-card-dialog.component.ts` e `.html`

**Modificar**
- `src/app/features/integrations/data/integration.model.ts`: `CreditCardLink`, requests.
- `src/app/features/integrations/data/integration-api.service.ts`: 5 métodos.
- `src/app/features/integrations/integrations.page.html` / `.ts`: incluir a seção, `reloadAll()`, label `CARD_LINK`.
- `src/app/features/integrations/accounts/bank-accounts.component.html` / `.ts`: texto do ramo `UNSUPPORTED`.
- `src/app/features/imports/data/import.model.ts`: `ImportKind`, campos novos, `account` anulável, `ApproveItem` com
  `asInvoicePayment`; `toApproveRequest` não exige categoria para sugestão de pagamento.
- `src/app/features/imports/imports.page.html` / `.ts`: linhas de `CARD_PURCHASE` e de sugestão.
- `docs/escopo-frontend.md`: tabela de rotas de `/integrations` (linha ~818), com os endpoints de `credit-card-links`.

**Backend (pedidos P3, P4, P5)**
- `ImportItemResponse`: `suggestedInvoice`.
- `CreditCardLinkResponse`: `importFrom`.
- Erro de aprovação em lote: id do item.

**Testes (Vitest)**
- `toApproveRequest`: sugestão sem categoria entra com `asInvoicePayment: true`; compra de cartão sem categoria fica de fora.
- `import.model`: contrato de `ImportItem` com `kind` e campos novos.
- `CreditCardLinksComponent`: ações por status; "Criar cartão" mostra dias só quando faltam; "Desvincular" pede confirmação.
- `CreateLinkedCreditCardDialogComponent`: dias obrigatórios só quando a conta não os informa.
- `IntegrationApiService`: URLs e verbos dos 5 endpoints (`HttpTestingController`).

Critério de pronto: lint, testes e build passam; `i18n:check` se o script existir (`ci.yml`).

## Fora de escopo

- Filtro da fila por cartão (exige `creditCardLinkId` em `GET /imports`).
- Estornos (o backend também não os envia).
- Limite disponível (`availableCreditLimit`): o backend não sincroniza nesta versão.
- Faturas da Pluggy espelhadas na tela de fatura.
- Edição de compra importada (compras de cartão não têm edição).
- Cartões de investimento.

## Premissas em aberto

- **P3, P4, P5** dependem de mudanças no backend (ver "Pedidos ao backend"). Sem P3, a sugestão mostra menos informação; sem P4, a
  data de corte não aparece; sem P5, o erro de lote não destaca a linha.
- Os demais itens (P1, P2, P6, P7) estão confirmados.
- `GET /accounts/options` (usado no diálogo de criação) segue o padrão de `GET /<recurso>/options` da escopo-frontend; não foi
  validado no backend nesta revisão.

## Revisão da spec

- **Placeholders:** nenhum. Os pedidos ao backend estão listados com efeito descrito.
- **Consistência com o backend:** endpoints, campos e códigos conferem com o código atual. A spec do backend ainda usa
  `CREDIT_CARD_INVOICE_CLOSED` e nomes sem módulo; o código real é `creditcard.INVOICE_CLOSED`. Vale corrigir a spec do backend.
- **Escopo:** cabe em um plano de implementação.

## Próximos passos

1. Backend: implementar os pedidos P3, P4 e P5, e corrigir os códigos de erro na spec do backend.
2. Revisão desta spec.
3. Plano de implementação (`writing-plans`): modelos e API, seção de cartões, fila, textos.
