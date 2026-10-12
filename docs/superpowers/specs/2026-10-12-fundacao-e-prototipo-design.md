# Fundação e protótipo com API mock (fases 0a e 0b): design

> 12/10/2026 · Referência: `docs/escopo-frontend.md` v0.2 (seções citadas como "escopo §N").

## 1. Objetivo

Criar o projeto `my-finance-web` e um **protótipo navegável com dados fictícios** para validar o design (tema, layout,
componentes, fluxos de CRUD e exibição de erros) **antes** de integrar com a `my-finance-api`.

O protótipo já usa a **arquitetura definitiva** (camada genérica de CRUD, interceptors, Transloco, tema). Só a origem dos dados é
falsa: um `mockApiInterceptor` responde às chamadas `/api/v1/...` no mesmo formato da API. Na fase 0c basta desligar o mock.

## 2. Escopo

**Dentro:**

| Item | Detalhe |
|---|---|
| Fundação (0a) | Projeto Angular 21 (standalone, zoneless, Vitest), angular-eslint + Prettier + Husky/lint-staged, aliases (`@core`, `@shared`, `@features`, `@api`, `@env`), Tailwind v4 + `tailwindcss-primeui`, PrimeNG 21 + preset Noir/slate, `ThemeService` (claro/escuro/sistema), Transloco + `primelocale` + `LOCALE_ID` pt-BR, `schema.d.ts` gerado, `git init` |
| Camada reutilizável (0b) | `shared/data` (page, http-params, dates), `shared/crud` (`CrudApi`, `injectCrudList`, `DataTable`, `FilterBar`, `CrudPage`, `CrudActions`, `LookupStore`), `shared/forms` (`injectFormSubmit`, `FormShell`, `Field`, `applyServerErrors`), `shared/ui` (`Money`, `StatCard`, `EmptyState`, `Chart`), pipes |
| Core (0b) | `authInterceptor`, `languageInterceptor`, `errorInterceptor` + `ApiError`, `AuthStore`, `authGuard`/`guestGuard`, shell (topbar + menu lateral/drawer), página 404 |
| API mock (0b) | `src/app/mock/`, seção 4 |
| Telas (0b) | Login, dashboard, contas, categorias, extrato de lançamentos (seção 5) |
| Testes | Unitários da lógica reutilizável (seção 7) |

**Fora** (fase 0c em diante): cadastro (`/register`), perfil, cartões e faturas, orçamentos, investimentos, CI, integração
com a API real, `i18n:check` no pipeline.

## 3. Sequência

1. **0a. Fundação.** Projeto, ferramentas, tema, i18n, shell vazio com menu, tipos da API. Ao final: app sobe, alterna tema,
   lint/test/build passam.
2. **0b.1. Camada base.** `shared/data`, `ApiError` + interceptors, `CrudApi`, `injectCrudList`, formulários, com testes.
3. **0b.2. Mock.** Banco em memória, roteador, handlers, configuração `mock`.
4. **0b.3. Telas.** Login → contas (estabelece o padrão de CRUD) → categorias → extrato → dashboard.
5. **Checkpoint de design.** O usuário navega no protótipo (desktop e celular, claro e escuro) e pede ajustes. Os ajustes
   entram antes da fase 0c.

## 4. API mock

### 4.1 Ativação e isolamento do build

- Configuração `mock` no `angular.json` com `fileReplacements` de `environment.ts` → `environment.mock.ts`. Script
  `npm run start:mock`.
- Os environments exportam a lista de interceptors extras: `environment.ts` exporta `mockInterceptors = []`;
  `environment.mock.ts` exporta `[mockApiInterceptor]`. Como só o `environment.mock.ts` importa `src/app/mock/`, o código do mock
  **não entra no bundle de produção**.
- Ordem: `[authInterceptor, languageInterceptor, errorInterceptor, ...mockInterceptors]`. O mock é o último, então os interceptors
  reais tratam as respostas dele exatamente como tratariam as da API (incluindo erros).

### 4.2 Estrutura

```
src/app/mock/
├── mock-api.interceptor.ts     # roteia método + URL para o handler; aplica latência (delay 300 ms)
├── mock-db.ts                  # estado em memória + seed determinístico
├── mock-http.ts                # ok(body), created(body), noContent(), problem(status, code, detail, errors?)
├── mock-page.ts                # filtra, ordena e pagina → PageResponse (mesmas regras de page/size/sort da API)
├── seed/                       # usuário, contas, categorias, lançamentos
└── handlers/
    ├── auth.handler.ts         # /auth/login, /me
    ├── accounts.handler.ts     # CRUD, /options, /{id}/balance, /{id}/archive
    ├── categories.handler.ts   # list, /options, POST, PUT, archive
    ├── transactions.handler.ts # CRUD, /transfers
    └── dashboard.handler.ts    # /summary, /expenses-by-category
```

- Um handler é `(req, params, db) => Observable<HttpEvent>`, registrado numa tabela `{ method, pattern: '/accounts/:id' }`.
  Rota não mapeada → 404 `common.RESOURCE_NOT_FOUND` + `console.warn` (sinal de que o mock está incompleto).
- Tipos dos corpos vêm do `schema.d.ts`: o mock quebra a compilação se o contrato mudar.

### 4.3 Dados

- **Seed determinístico** (ids fixos, datas relativas ao mês atual) recriado a cada carga da página. Recarregar o navegador volta
  ao estado inicial, mas os ids continuam válidos, então filtros na URL sobrevivem ao reload.
- Usuário: "Gabriel" / `demo@myfinance.dev`.
- 4 contas (corrente, poupança, carteira, investimentos), uma delas arquivada.
- ~20 categorias em árvore (receitas: salário, freelance, rendimentos; despesas: moradia, alimentação → mercado/restaurante,
  transporte, saúde, lazer...), com cor e ícone PrimeIcons, uma arquivada e a categoria de sistema "Pagamento de fatura"
  (`system: true`).
- ~150 lançamentos em 3 meses (anterior, atual e próximo): receitas e despesas recorrentes, transferências, alguns `PENDING`
  (datas futuras), 2 ou 3 lançamentos ligados a fatura de cartão (`creditCardInvoiceId` preenchido) e um com categoria de sistema,
  para exercitar as linhas não editáveis.

### 4.4 Regras reproduzidas

O mock reproduz só o necessário para a UI se comportar como na API real:

- Paginação, ordenação (`sort=campo,dir` com os nomes de atributo da entidade, como `transactionDate`) e os filtros documentados de
  cada endpoint. Campo de ordenação desconhecido → 400 `common.MALFORMED_REQUEST`, igual à API.
- `archived` padrão, `/options` sem a categoria de sistema, status padrão por data (futuro → `PENDING`).
- Saldo (`currentBalance` só `CLEARED`, `projectedBalance` com pendentes) e dashboard (receitas e despesas do mês com `PENDING` +
  `CLEARED`, sem transferências nem categoria de sistema; despesas agrupadas pela categoria raiz). Esses cálculos existem **só no
  mock** e imitam o backend; o app continua sem cálculo financeiro (escopo §3.2).
- Validação mínima por `@NotBlank`/`@NotNull`/`@Positive` dos requests → 400 `common.VALIDATION_ERROR` com `errors[]`.
- Erros de negócio reais (422): `transaction.TRANSFER_SAME_ACCOUNT`, `transaction.CREDIT_CARD_TRANSACTION` e
  `transaction.SYSTEM_TRANSACTION` (editar ou excluir lançamento de cartão ou de sistema), `transaction.CATEGORY_TYPE_MISMATCH`,
  `category.NAME_ALREADY_EXISTS` e `category.SUBCATEGORY_DEPTH_EXCEEDED`. Os `detail` imitam os textos do backend
  (`messages/*.properties`).

### 4.5 Gatilhos de erro para validar a UI

| Gatilho | Resposta |
|---|---|
| Login com senha `errada` | 401 `auth.INVALID_CREDENTIALS` (mensagem no formulário) |
| Texto contendo `#409` em nome/descrição | 409 `common.DATA_CONFLICT` (`p-message` no diálogo) |
| Texto contendo `#500` | 500 (toast genérico) |
| Filtro de descrição `#lento` | Latência de 3 s (skeleton/loading) |
| Botão "Expirar sessão" no menu do usuário (só na configuração `mock`) | Próxima chamada devolve 401 → logout e toast "Sessão expirada" |

## 5. Telas e o que cada uma valida

| Tela | Rota | Valida |
|---|---|---|
| Login | `/login` | Layout de convidado (sem shell), formulário com `<app-field>`, erro 401 no formulário, `guestGuard`, `returnUrl` |
| Shell | todas internas | Topbar, menu lateral (desktop) e drawer (mobile), alternância de tema, menu do usuário, item ativo |
| Contas | `/accounts` | Padrão de CRUD completo: `CrudPage` + `FilterBar` (texto, enum, booleano) + `DataTable` (enum, money, arquivado esmaecido) + formulário em diálogo (criar/editar, `Create`×`Update`) + arquivar com confirmação + toast. Coluna de saldo atual/projetado via `/balance` por linha |
| Categorias | `/categories` | Abas Receita/Despesa, árvore (`p-treetable`, todas carregadas de uma vez com `size=100`, sem paginação), cor e ícone, subcategoria com tipo herdado, edição recebendo a linha (sem `GET /{id}`), filtro de arquivadas, categoria de sistema oculta |
| Extrato | `/transactions` | Filtros ricos (período, `AccountSelect`, `CategorySelect` em árvore, tipo, status, descrição com debounce) sincronizados com a URL, `<app-money>` com sinal e cor por tipo, tag de status, ações por linha (editar, excluir, **efetivar**) e linhas de cartão/sistema somente leitura com indicação, botão "Novo" com escolha receita/despesa/transferência, formulário de transferência, filtros em drawer no mobile, estado vazio |
| Dashboard | `/dashboard` | Seletor de mês, 4 `StatCard` (saldo total, receitas, despesas, resultado), rosca de despesas por categoria com `category.color` em claro e escuro, mês sem dados (estado vazio) |
| 404 | `**` | Página de erro dentro do shell |

Lookups: `AccountSelect` e `CategorySelect` usam `/options` com o `LookupStore`; salvar ou arquivar uma conta ou categoria
invalida o cache correspondente.

## 6. Decisões de implementação deste trabalho

- **Categorias fora do `injectCrudList`:** a árvore precisa de todas as categorias do tipo; `CategoryApi.listAll(filter)` busca
  `size=100` e a função pura `buildCategoryTree` monta os nós. O resto (formulário, `CrudActions`) segue o padrão.
- **"Efetivar"** usa `update(id, { ...camposDaLinha, status: 'CLEARED' })`; não existe endpoint dedicado.
- **Nenhum texto fixo:** JSON `pt-BR` global + escopos `auth`, `accounts`, `categories`, `transactions`, `dashboard`.
- **Responsividade** verificada em 375 px (celular) e 1440 px (desktop).

## 7. Testes

Vitest, só lógica (escopo §9):

- `toHttpParams` (vazios ignorados, `Date` → `LocalDate`, `sort`), `toLocalDate`/`fromLocalDate`/`toYearMonth` (incluindo
  23h em `America/Sao_Paulo`).
- `injectCrudList`: filtro novo volta à página 0; leitura e gravação dos filtros na URL; `reload`; erro mantém os dados.
- Conversão do `onLazyLoad` em `PageRequest` (inclusive `sortField` customizado e `false`).
- `applyServerErrors`, `injectFormSubmit` (bloqueio de envio duplo, erro de validação aplicado nos campos).
- `errorInterceptor`: tabela status/código → comportamento (escopo §5.2).
- `AuthStore`: login grava token e expiração; expiração dispara logout.
- `buildCategoryTree`.
- `mock-page` (filtro, ordenação e paginação), porque o protótipo depende dele estar certo.

## 8. Critérios de aceite

- `npm run start:mock` sobe o app; dá para fazer login e navegar pelas 5 telas com dados.
- Criar, editar, arquivar, excluir e efetivar funcionam no mock e se refletem na listagem, nos lookups e no dashboard.
- Todos os gatilhos da seção 4.5 produzem o comportamento previsto no escopo §5.2.
- Claro e escuro corretos em todas as telas; layout utilizável em 375 px.
- `npm run lint`, `npm test` e `npm run build` passam; o bundle de produção não contém o código do mock (busca por
  `mockApiInterceptor` no `dist/` sem resultado).

## 9. Pré-requisitos e riscos

- **`npm run api:types` precisa da API rodando** (`compose.yaml` do backend + `./mvnw spring-boot:run`) uma vez para gerar o
  `schema.d.ts`, que é versionado. Se a API não subir, o plano para no passo e pede ajuda; não escrever os tipos à mão.
- **Compatibilidade de versões:** conferir os `peerDependencies` de `primeng@21`, `ngx-echarts@21`, `@jsverse/transloco` e
  `tailwindcss-primeui` com o Angular 21 instalado. Incompatibilidade bloqueia o passo e é reportada antes de qualquer
  contorno (`--legacy-peer-deps` não é usado sem aprovação).
- O mock duplica algumas regras do backend (seção 4.4). Divergências aparecem na fase 0c; o mock é removido ou mantido só para
  desenvolvimento offline, decisão da 0c.
