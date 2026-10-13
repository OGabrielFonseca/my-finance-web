# Features faltantes do frontend: spec

> Data: 12/10/2026 · Base: `docs/escopo-frontend.md` (v0.3, seções 11 e 14) comparado com o código em `main` (commit `be04ecd`).
> Este documento inventaria o que falta, define o desenho de cada item e decide a ordem de entrega. Cada entrega tem seu plano
> em `docs/superpowers/plans/`.

## 1. Inventário: o que existe e o que falta

Fonte: roadmap (escopo §14) e telas por fase (escopo §11), verificados contra as rotas em `src/app/app.routes.ts`, as features em
`src/app/features/` e os scripts do `package.json`.

| Fase | Item do escopo | Situação | Evidência |
|---|---|---|---|
| 0a | Fundação (Angular 21, lint, Tailwind + PrimeNG, tema, Transloco, shell) | **Feito** | `app.config.ts`, `core/layout/shell.component.*`, `core/theme/` |
| 0b | Protótipo: camada CRUD, interceptors, `ApiError`, `AuthStoreService`/guards, login, dashboard, contas, categorias, extrato | **Feito** | `shared/crud/`, `core/http/`, `core/auth/`, `features/{auth,dashboard,accounts,categories,transactions}` |
| 0c | Cadastro (`/register`, link no login, testes do `register()`) | **Feito no código, falta verificação manual** contra o backend (passo 7 do plano de cadastro) | commits `0c2ccc4`, `9200be1`, `f119c65`; plano em `plans/2026-10-12-cadastro-usuario.md` |
| 0c | **CI** (lint + test + build + i18n:check) | **Falta** | não existe `.github/workflows/` |
| 0c | **`npm run i18n:check`** (`transloco-keys-manager find --emit-error-on-extra-keys`) | **Falta** | script ausente no `package.json`; pacote `@jsverse/transloco-keys-manager` não instalado |
| 1 | Extrato com efetivar e transferências | **Feito** | `features/transactions/` (`CLEAR_ACTION`, `transfer-form.component.ts`) |
| 1 | Saldo atual e projetado por conta | **Feito** | `account-list.page.ts` (chamada `/balance` por linha) |
| 1 | **Perfil `/profile`** (`GET/PUT /me`) | **Falta** | sem rota, sem feature, sem item de menu; `GET /me` existe só no `AuthApiService` |
| 1 | Estado vazio de categorias no lançamento | **Não verificado** | depende de checagem manual |
| 2 | **Cartões** `/credit-cards`, detalhe com faturas `/credit-cards/:id`, fatura `/credit-cards/:id/invoices/:invoiceId` | **Falta** | sem `features/credit-cards/` |
| 2 | **Orçamentos** `/budgets` | **Falta** | sem `features/budgets/` |
| 3 | **Investimentos**: carteira, ativos (+ posição), operações, proventos | **Falta** | sem `features/investments/` |
| 4 | Evoluções (en, PWA, OFX/CSV, relatórios, Angular 22) | Fora deste ciclo | escopo §14 |

**Divergência de estrutura (decidir):** o escopo §3.1 prevê `shared/pipes/` (`money`, `localDate`, `yearMonth`, `enumLabel`). Hoje
não existe; a formatação é feita por componente (`shared/ui/money.component.ts`) e pelo `CurrencyPipe`/`DecimalPipe`. Decisão
proposta: **não criar as pipes agora**. Atualizar o escopo §3.1 quando a fase 2 pedir datas e enums em vários lugares; antes disso
seria abstração sem uso.

**Resumo:** faltam, nesta ordem de prioridade, (a) verificação do cadastro, CI e `i18n:check` (fase 0c), (b) perfil (fase 1),
(c) cartões e orçamentos (fase 2), (d) investimentos (fase 3).

## 2. Escopo deste documento

- **Detalhado e pronto para executar:** entrega A, perfil + CI + `i18n:check` (plano `plans/2026-10-12-perfil-e-ci.md`).
- **Desenhado aqui, plano depois:** fases 2 e 3. Não há plano com código agora porque o contrato dos endpoints dessas telas
  (`escopo-backend.md`) não está neste repositório. Escrever o plano sem o contrato significaria inventar campos de DTO, e um
  plano com campo inventado quebra no primeiro teste contra a API real. Ver seção 5.

## 3. Desenho das entregas

### 3.1 Entrega A: perfil, CI e i18n:check (fase 1 e 0c)

**Perfil (`/profile`)**
- Rota dentro do `ShellComponent` (protegida por `authGuard`), lazy, com escopo Transloco `profile`.
- Página com nome editável e e-mail e data de criação só leitura, vindos de `AuthStoreService.user()`.
- Salvar chama `PUT /me` com `{ name }` e atualiza o usuário no store, para o nome do menu mudar sem recarregar.
- Item "Perfil" no menu do usuário (`user-menu.component.ts`), ao lado de "Sair", que é o que o escopo §6.2 descreve.
- Formulário com `NonNullableFormBuilder` e `injectFormSubmit`, igual ao cadastro. Sem teste de componente (escopo §9); a lógica
  nova (`setUser`) tem teste unitário.
- **Contrato confirmado no backend** (`UpdateMeRequest`): `PUT /me` exige `{ name, email }`. O e-mail é editável no perfil. Troca de senha fica para o módulo de autenticação e não entra aqui.

**CI (`.github/workflows/ci.yml`)**
- Em `push` e `pull_request`: `npm ci`, `npm run lint`, `npm test`, `npm run build`, `npm run i18n:check`, nesta ordem, parando na
  primeira falha.
- Node 22 (Angular 21 exige Node `^20.19 || ^22.12 || >=24`).

**`i18n:check`**
- Instalar `@jsverse/transloco-keys-manager` como dev dependency, na versão compatível com `@jsverse/transloco` 8.x, e adicionar o
  script `"i18n:check": "transloco-keys-manager find --emit-error-on-extra-keys"`.
- Antes de ativar no CI, rodar uma vez e corrigir as chaves que apareçam. Se houver chave usada mas não declarada, ou declarada e
  não usada, a correção vai no JSON ou no template, nunca no script.

### 3.2 Entrega B: cartões e faturas (fase 2), desenho

- `features/credit-cards/` com a mesma estrutura de `accounts` (`index.ts`, `data/`, `list/`, `form/`).
- `CreditCardApiService` herda `CrudApiService` para o CRUD de cartões. Faturas e compras são **nested** (escopo §4.2): um service
  próprio recebe o `cardId` em cada método (`invoices(cardId, page)`, `close(cardId, invoiceId)`, `payment(...)`,
  `deletePurchase(cardId, transactionId)`).
- Três telas: `/credit-cards` (CRUD em diálogo), `/credit-cards/:id` (faturas e nova compra à vista ou parcelada),
  `/credit-cards/:id/invoices/:invoiceId` (lançamentos da fatura, fechar, pagar, excluir compra).
- Regras do backend que a UI precisa respeitar (escopo §11): compra não é editada (excluir e criar de novo); fatura `CLOSED` ou
  `PAID` não aceita compra; lançamento de cartão não é editável em `/transactions`, só pela fatura.
- Rota de detalhe com `:id`: 404 redireciona para a listagem (escopo §5.2).

### 3.3 Entrega C: orçamentos (fase 2), desenho

- `/budgets?month=` com seletor de mês. Barra planejado × realizado (`spent`), calculado pela API.
- `month` do orçamento é `LocalDate` (1º dia do mês, `2026-10-01`). O helper converte de `YearMonth` do seletor (escopo §4.7 e
  §15, pedido "month como YearMonth" pendente no backend).
- Edição só do valor; criação define categoria e mês (regra do escopo §11).

### 3.4 Entrega D: investimentos (fase 3), desenho

- Quatro áreas: `/investments` (carteira: custo total, rosca por classe, posições abertas, `GET /investments/portfolio`),
  `/investments/assets` (CRUD de ativos com detalhe de renda fixa condicional a `FIXED_INCOME`/`TREASURY`, e posição por
  `GET /assets/{id}/position`), `/investments/operations` e `/investments/incomes` (CRUD).
- `features/investments/` com sub-pastas por área. Ativo é lookup (`AssetSelect`, via `/assets/options`).
- **Dinheiro e quantidade:** `p-inputnumber` com 8 casas para quantidade e preço (escopo §4.7, `NUMERIC(19,8)`).
- Cálculo de preço médio e posição vem da API (escopo §3.2: nada de cálculo financeiro no front).

## 4. Ordem de execução

1. **Entrega A** (plano pronto): fecha a fase 0c e a fase 1. Não depende de nada além do backend rodando para a verificação manual.
2. **Entrega B** (cartões): maior ganho, porque faturas são o próximo bloqueio do uso real.
3. **Entrega C** (orçamentos): depende de `/budgets` e do seletor de mês, que já existe no dashboard.
4. **Entrega D** (investimentos): maior; pode virar três planos (carteira, ativos, operações + proventos).

Cada entrega termina com `npm run lint`, `npm test`, `npm run build` e `npm run i18n:check` verdes, e com verificação manual contra
o backend antes de ser dada como pronta.

## 5. Riscos e pré-requisitos

- **Contrato do backend não está no repo.** `escopo-backend.md` (v0.5), citado pelo escopo do frontend, não está aqui. Antes das
  entregas B, C e D, o contrato dos endpoints tem que ser lido e conferido. Este documento só usa o que o escopo do frontend cita.
- **Corpo do `PUT /me`** (entrega A): a confirmar, ver 3.1.
- **Verificação manual** do cadastro e do perfil depende do backend em `http://localhost:8080`. Quando ele não estiver disponível,
  a entrega é dita como "não verificada no navegador", sem marcar como concluída.
- **CORS:** o proxy de dev resolve; em produção, a decisão continua em aberto (escopo §15). Fora do escopo destas entregas.

## 6. Fora deste ciclo

- Dashboard com evolução mensal (receitas × despesas por mês): depende de endpoint que não existe.
- Totais do extrato: depende de `GET /transactions` com totais no backend.
- `currentBalance` na listagem de contas: pedido ao backend; o N+1 atual é aceito.
- Seed de categorias no cadastro: pedido ao backend; hoje há estado vazio com link.
- Fase 4 do escopo (en, PWA, OFX/CSV, relatórios, Angular 22).
