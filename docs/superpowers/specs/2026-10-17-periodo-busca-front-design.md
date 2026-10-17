# Período de busca e alteração da data de corte — Design (frontend)

> 17/10/2026 · Status: **aguardando revisão** · Referências: `docs/escopo-frontend.md` ("escopo §N"),
> `2026-10-15-importacoes-design.md` (contas do banco, "importações §N") e a spec do backend
> `my-finance-api/docs/superpowers/specs/2026-10-17-periodo-busca-categorias-pluggy-design.md` ("API §N").

## 1. Objetivo

Refletir no frontend as mudanças do backend de 17/10:
1. O usuário escolhe, por conta, a partir de quando buscar, ao vincular **ou criar** a conta (até 12 meses atrás).
2. O usuário altera a data de corte de uma conta já vinculada, com a regra de cada direção (API §1.3).
3. Os erros novos aparecem na tela com a mensagem da API.

O mapa de categorias da Pluggy (API §2) não muda a tela: as sugestões chegam prontas.

## 2. Escopo

**Dentro:** feature `integrations` (pasta `accounts/` e `data/`), com um helper puro de limites de data.

**Fora:** qualquer mudança em `shared/`; mudança na lista de categorias padrão (a tela usa o que a API devolve); "desfazer"
de pendentes ignorados (a fila ainda não tem essa ação).

## 3. Limites da data de corte

Helper puro em `features/integrations/data/import-from.ts`:

```ts
export function importFromRange(today: Date): { min: Date; max: Date };
```

- `max` = hoje; `min` = hoje − 12 meses, **igual ao `LocalDate.minusMonths(12)` do backend**: quando o dia não existe no mês
  de destino, vai para o último dia (29/02/2028 → 28/02/2027). Não usar `setMonth` puro, que estoura para março.
- Datas sem horário: a comparação é só de dia, no fuso local.
- Usado pelos dois diálogos (`[minDate]` e `[maxDate]` do `p-datepicker`). Padrão de todos os campos: hoje.
- Texto de ajuda abaixo do campo: "Entre {{ min }} e hoje. O banco guarda até 12 meses de lançamentos."

## 4. Ajustes nos diálogos existentes

**Vincular** (`link-account-dialog`): o `p-datepicker` ganha os limites de §3. O texto atual ("lançamentos anteriores a essa
data não entram") continua.

**Criar conta** (`create-account-dialog`): hoje o texto fixo diz "Só entram transações a partir de hoje.", e o body não envia
data. Passa a ter o campo **"Importar a partir de"** (mesmo `p-datepicker`, padrão hoje) e envia `importFrom` (a API aceita e
omitida = hoje). O texto fixo vira o texto de §3, e o saldo inicial continua sendo o saldo atual do banco.

`CreateBankAccountRequest` ganha `importFrom?: string` (`yyyy-MM-dd`, via `toLocalDate`).

## 5. Alterar data de corte (nova ação)

Na linha de conta `LINKED` (bloco "Contas do banco", importações §4), o botão **"Alterar data"** (`pi pi-calendar`) fica
depois de "Ajustar saldo". A linha já mostra a data atual de corte (`importFrom`).

Diálogo `ChangeImportFromDialogComponent` (`p-dialog`, formulário reativo com `injectFormSubmit`):
- `p-datepicker` com os limites de §3, pré-preenchido com a data atual.
- O texto muda conforme a nova data, comparada com a atual:

| Nova data | Texto exibido | Chamada |
|---|---|---|
| Igual à atual | "A data já é esta." Botão desabilitado | Nenhuma: fecha o diálogo |
| Mais recente | "Os pendentes com data anterior a {{ nova }} serão ignorados. Nada é apagado, mas eles não voltam para a fila." | `PATCH` |
| Mais antiga | "Vamos buscar os lançamentos desde {{ nova }} agora. Os novos itens entram na fila." | `PATCH` |

- Chamada: `PATCH /integrations/pluggy/accounts/{linkId}/import-from` com `{ importFrom }` → `BankAccountLink` (API §1.3).
  Novo método em `IntegrationApiService`: `changeImportFrom(linkId, body, context?)`, com `context` para o `applyServerErrors`.
- Sucesso: toast "Data alterada · N itens na fila" (usa `pendingItems` da resposta); recarrega as contas e o contador do menu.
- Erro: o diálogo **fica aberto**, para o usuário corrigir ou tentar de novo. A mensagem vem do `errorInterceptor`:
  `IMPORT_FROM_OUT_OF_RANGE` (com as datas já formatadas pela API) e `LINK_NOT_LINKED`. Se a busca retroativa falhar no banco
  (422 do provedor), a data antiga fica gravada como antes, e o toast mostra o erro.
- O botão de "Alterar data" só aparece em `LINKED`. Nos outros status não existe.

## 6. Sugestões de categoria e transferências

Sem mudança de tela. Três pontos para ter em mente:
- As novas sugestões (Aposentadoria, Auxílio governamental, Gás, Telefone, Dentista) aparecem na célula de categoria, porque
  vêm da lista da API. Elas só existem para **cadastros novos**: contas antigas não ganham essas categorias (API §3).
- "Possível transferência" (importações §5.1) passa a sinalizar também pagamento de cartão, PIX e TED. Pagamento a terceiros
  não é sinalizado.
- A categoria sugerida continua pré-preenchida e editável, como antes.

## 7. Textos e i18n

Textos direto no código, em português (escopo §7.1). Nada de arquivos `public/i18n`. Os erros vêm prontos da API.

## 8. Testes

Pelo critério do escopo §9 (só lógica):
- `importFromRange`: hoje → hoje − 12 meses; 29/02 → 28/02 do ano anterior; 31/08 → 31/08 do ano anterior; hora do dia não
  altera o resultado.
- Decisão "igual / mais recente / mais antiga" (função pura, usada pelo texto e pela chamada): data igual não chama a API.

Diálogos, templates e `IntegrationApiService` não são testados.

## 9. Atualizações no escopo do frontend

Quando implementar, atualizar `docs/escopo-frontend.md`:
- §11, linha `/integrations`: incluir "alterar data de corte" e o endpoint `PATCH …/accounts/{linkId}/import-from`.
- §9: os testes de `importFromRange` e da decisão de §8.
