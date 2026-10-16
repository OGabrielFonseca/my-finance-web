# Importações: sincronização, contas do banco e fila de revisão — Design (frontend)

> 15/10/2026 · Status: **aguardando revisão** · Referências: `docs/escopo-frontend.md` ("escopo §N"),
> `2026-10-14-integracoes-design.md` (tela de integrações) e a spec do backend
> `my-finance-api/docs/superpowers/specs/2026-10-15-sincronizacao-integracoes-design.md` ("API §N").

## 1. Objetivo

1. Sincronizar os bancos sob demanda (todos ou um).
2. Decidir o destino de cada conta encontrada no banco: vincular, criar conta nova ou ignorar; ver a diferença de saldo e
   ajustar.
3. Revisar a **fila de importação**: conferir a categoria sugerida, aprovar ou ignorar, um a um ou em lote.

## 2. Escopo

**Dentro:** novos blocos na página de Integrações (§3 e §4), nova feature `imports` (§5) e o contador no menu (§6).

**Fora:** cartões e investimentos; mudanças em `shared/` além de usar o que existe.

## 3. Integrações › Bancos conectados: sincronização

No bloco existente (spec de integrações §4.2):
- Botão **"Sincronizar agora"** no cabeçalho do bloco → `POST /sync`. Toast com o resumo por banco
  ("Nubank: 14 novos itens · Itaú: aguarde 6 min · Inter: erro, veja o histórico").
- Ícone de sincronizar em cada linha → `POST /connections/{id}/sync`. Erros 422 (`SYNC_TOO_SOON`, `SYNC_IN_PROGRESS`) aparecem
  pelo `errorInterceptor` com a mensagem da API.
- Status `SYNCING` ganha tag "Sincronizando" com `p-progressSpinner` pequeno; os botões da linha ficam desabilitados.
- Depois de qualquer sync: recarrega bancos, contas do banco (§4), histórico e o contador do menu (§6).

## 4. Integrações › Contas do banco (novo bloco)

Entre "Bancos conectados" e "Histórico". Dados de `GET /accounts` (API §5.2), agrupados por banco.

| Status | Exibição | Ações |
|---|---|---|
| `PENDING` | destaque "Nova conta encontrada", nome e número do banco, saldo do banco | **Vincular**, **Criar conta**, Ignorar |
| `LINKED` | conta do MyFinance, data de corte, "Banco R$ X · MyFinance R$ Y", diferença em vermelho se ≠ 0, "N pendentes na fila" (link para a fila filtrada) | **Ajustar saldo** (só com diferença), Desvincular |
| `IGNORED` | esmaecida | Vincular, Criar conta |
| `UNSUPPORTED` | tag "Cartão: em breve" | nenhuma |

Diálogos (`p-dialog`, formulários reativos com `applyServerErrors`):
- **Vincular:** select de contas ativas (`AccountLookupService`, `/accounts/options?archived=false`) e "Importar a partir de"
  (`p-datepicker`, padrão hoje). Texto: lançamentos anteriores a essa data não entram.
- **Criar conta:** nome (padrão: nome no banco) e tipo (Corrente/Poupança). Texto: o saldo inicial será o saldo atual do banco
  (R$ X) e só entram transações a partir de hoje.
- **Ajustar saldo:** confirmação "Criar um lançamento de R$ D (receita/despesa) em 'Ajuste de saldo' para o saldo ficar igual
  ao do banco?". Aviso se houver itens pendentes: "Aprove a fila antes; a diferença pode ser só isso."

Depois de vincular ou criar, a API já busca as transações da conta; toast "Conta vinculada · N itens na fila".

## 5. Feature `imports` (fila de revisão)

Rota `/imports` (lazy, escopo Transloco `imports`), item de menu "Importações" (`pi pi-inbox`) logo depois de "Lançamentos".

```
features/imports/
├── imports.routes.ts
├── imports.page.ts / .html
└── data/
    ├── import.model.ts            # ImportItem, ImportFilter, ApproveRequest
    └── import-api.service.ts      # list, count, approve, ignore
```

Também acrescenta em `features/integrations/data/` os models e métodos de §3 e §4 (`sync`, `syncConnection`, `accounts`,
`link`, `createAccount`, `ignoreAccount`, `unlinkAccount`, `adjustBalance`).

### 5.1 Lista

- Estado da listagem com `injectCrudList` e tabela com `<app-data-table>` (escopo §4.3 e §4.4); filtros com `<app-filter-bar>`:
  status (padrão **Pendentes**), conta, período, "Só possíveis transferências".
- Colunas: seleção, data, descrição, valor (`MoneyComponent`, +/− pelo tipo), conta, **categoria** (célula editável:
  `p-select` com as categorias ativas do tipo do item, `CategoryLookupService`, pré-preenchida com a sugestão), sinais e ações.
- Sinais (ícones com tooltip): "Categoria no banco: {{ externalCategoryName }}"; **Possível transferência**; **Possível
  duplicata** de "{{ descrição }} em {{ data }}" (link abre o lançamento).
- Ações por linha: **Aprovar** (desabilitado sem categoria) e **Ignorar**.
- Em lote: seleção múltipla → **Aprovar selecionados** (só os que têm categoria; avisa quantos ficaram de fora) e
  **Ignorar selecionados**. Limite de 100 por chamada (API §5.3); a página tem 50 por padrão.
- A categoria escolhida em cada linha fica num `Map<itemId, categoryId>` da página (signal), inicializado com a sugestão;
  descrição não é editável nesta versão (a API aceita, mas a tela não usa).
- Status `APPROVED`/`IGNORED` (filtro) mostram a linha só leitura; aprovado com link para o lançamento.
- Estado vazio (`EmptyState`): "Nada para revisar" com atalho para Integrações se não houver conta vinculada.

### 5.2 Fluxo de aprovação

```
Aprovar (linha ou lote)
  → importApi.approve({ items: [{ id, categoryId }] })
  → sucesso: toast "N lançamentos criados"; recarrega a página atual e o contador do menu
  → 422: mensagem da API (aponta o item); nada foi gravado (tudo ou nada)
```

## 6. Contador no menu

Item "Importações" com `p-badge` mostrando `GET /imports/count` quando `pending > 0`. Atualizado ao entrar no shell, a cada
navegação para `/imports` ou `/integrations` e depois de aprovar, ignorar ou sincronizar. Um `ImportCountStore`
(`providedIn: 'root'`, signal + `refresh()`) evita espalhar chamadas. O `MenuEntry` ganha um campo opcional `badge`
(`Signal<number>`).

## 7. i18n

- `public/i18n/imports/pt-BR.json`: títulos, colunas, filtros, sinais, ações, mensagens de lote e estado vazio.
- `public/i18n/integrations/pt-BR.json`: chaves de sincronização (§3), contas do banco (§4), diálogos e status
  (`PENDING`, `LINKED`, `IGNORED`, `UNSUPPORTED`, `SYNCING`) e as operações `SYNC`, `LINK_ACCOUNT`, `BALANCE_ADJUSTMENT`.
- `menu.imports` em `public/i18n/pt-BR.json`.

## 8. Testes

Pelo critério do escopo §9 (só lógica):
- `ImportCountStore`: `refresh` atualiza o signal; erro mantém o valor anterior.
- Função pura `toApproveRequest(selected, categoryByItem)`: separa os itens com e sem categoria (base do aviso do lote).

Telas e services HTTP não são testados.

## 9. Atualizações no escopo do frontend

`docs/escopo-frontend.md`: feature `imports` (§3.1), rota e menu (§11), badge no `MenuEntry` (§6.2) e os testes da §8.
