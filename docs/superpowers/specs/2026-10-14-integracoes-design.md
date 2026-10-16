# Integrações: tela de credenciais, bancos conectados e widget da Pluggy — Design (frontend)

> 14/10/2026 · Status: **aguardando revisão** · Referência: `docs/escopo-frontend.md` (seções citadas como "escopo §N") e a spec
> do backend `my-finance-api/docs/superpowers/specs/2026-10-14-conexao-pluggy-widget-design.md` ("API §N").

## 1. Objetivo

Uma tela onde o usuário:
1. cadastra as credenciais da sua aplicação na Pluggy (Client ID e Client Secret do Meu Pluggy gratuito);
2. conecta bancos pelo **widget oficial** (Pluggy Connect), sem copiar ids do Dashboard da Pluggy;
3. vê, renomeia e remove os bancos conectados;
4. consulta o histórico de operações e erros da integração.

Sincronização, fila de revisão e vínculos ficam para specs seguintes.

## 2. Escopo

**Dentro:** feature `integrations` (rota, menu, página, services, models, i18n) e a dependência `pluggy-connect-sdk`.

**Fora:** qualquer mudança em `shared/` (a tela não é CRUD padrão e não justifica abstração nova); telas de sync e fila.

## 3. Rota, menu e estrutura

- Rota `/integrations` (lazy, filha do `ShellComponent`, escopo Transloco `integrations`).
- Item de menu `menu.integrations` ("Integrações", `pi pi-link`), depois de "Investimentos".
- Por enquanto há um só provedor; a página abre direto na Pluggy (`provider = 'pluggy'`). Se surgir outro, a rota vira
  `/integrations/:provider` com uma lista antes; nada abaixo muda.

```
features/integrations/
├── integrations.routes.ts
├── integrations.page.ts / .html            # página única, três blocos (seção 4)
└── data/
    ├── integration.model.ts                # espelha os DTOs da API §5 (escritos à mão, escopo §5.4)
    ├── integration-api.service.ts          # HTTP, um método por endpoint
    └── pluggy-connect.service.ts           # único arquivo que importa o pluggy-connect-sdk
```

`integration.model.ts`:

```ts
export type IntegrationProvider = 'PLUGGY';
export type ConnectionStatus = 'PENDING_SYNC' | 'OK' | 'ERROR';

export interface IntegrationField { name: string; secret: boolean; required: boolean; value: string | null; filled?: boolean; }
export interface IntegrationConnection {
  id: string; externalId: string; name: string | null; status: ConnectionStatus; lastSyncAt: string | null; createdAt: string;
}
export interface Integration {
  provider: IntegrationProvider; configured: boolean; fields: IntegrationField[];
  maxConnections: number; connections: IntegrationConnection[];
}
export interface IntegrationLog {
  id: string; connectionId: string | null; operation: string; level: 'INFO' | 'ERROR'; message: string; createdAt: string;
}
export interface SaveIntegrationRequest { data: Record<string, string>; }
```

`IntegrationApiService` (`providedIn: 'root'`, base `${environment.apiUrl}/integrations/{provider}`): `get`, `save`, `remove`,
`createConnectToken`, `registerConnection`, `renameConnection`, `deleteConnection`, `logs(page)`. Não estende o
`CrudApiService`: os endpoints não seguem o formato de CRUD.

## 4. Página

Layout em três blocos (`p-card`), empilhados no celular:

### 4.1 Credenciais

- Formulário reativo **montado a partir de `fields`** da resposta: um campo por item; `secret` usa `p-password`
  (sem medidor, com botão de mostrar), os demais `pInputText`. Rótulos por chave i18n `fields.<NAME>` (ex.: `fields.CLIENT_ID`).
- Campos secretos **nunca** vêm preenchidos. Com `filled = true`, o placeholder mostra "•••••• (já cadastrado)", mas o `PUT`
  exige todos os obrigatórios (API §5), então o usuário digita de novo para alterar.
- Estado no topo do bloco: "Configurado" (tag verde) ou "Não configurado".
- Ajuda curta: criar a aplicação no Dashboard da Pluggy com a mesma conta do Meu Pluggy; aviso de que trocar de aplicação
  exige remover e reconectar os bancos.
- Botões: "Salvar" (com `form-submit`/`applyServerErrors` do `shared/forms`) e "Remover integração" (confirmação; apaga
  bancos e histórico).

### 4.2 Bancos conectados

- `p-table` simples (sem paginação; no máximo `maxConnections` linhas): nome (edição inline; vazio mostra "Banco sem nome"),
  status (`p-tag`: Aguardando 1ª sincronização / OK / Erro), última sincronização, conectado em, ação de excluir (confirmação:
  "Remove só no MyFinance. Para revogar o acesso, use o Meu Pluggy.").
- Contador "2 de 5 bancos".
- Botão **"Conectar banco"**: desabilitado sem integração configurada ou no limite.

### 4.3 Histórico

- `p-table` paginada (lazy, 10 por página) com data/hora, nível (`p-tag` vermelha para ERROR), operação (rótulo i18n
  `operations.<OPERATION>`), banco (nome da conexão, quando houver) e mensagem.
- Recarrega depois de qualquer ação da página.

## 5. Fluxo "Conectar banco"

```
clique ──► integrationApi.createConnectToken()          → { accessToken }
       ──► pluggyConnect.open({ connectToken, connectorId: 200 })
             ├─ onSuccess({ item }) → resolve(item.id)
             ├─ onError(error)      → reject(error)
             └─ onClose sem sucesso → resolve(null)
       ──► id != null ? integrationApi.registerConnection(id) : fim
       ──► recarrega integração e histórico; toast "Banco conectado"
```

`PluggyConnectService`:

```ts
@Injectable({ providedIn: 'root' })
export class PluggyConnectService {
  async open(options: { connectToken: string; connectorId: number }): Promise<string | null> {
    const { PluggyConnect } = await import('pluggy-connect-sdk');   // fora do bundle inicial
    return new Promise((resolve, reject) => {
      let done = false;
      new PluggyConnect({
        connectToken: options.connectToken,
        selectedConnectorId: options.connectorId,
        onSuccess: ({ item }) => { done = true; resolve(item.id); },
        onError: (error) => { done = true; reject(error); },
        onClose: () => { if (!done) resolve(null); },
      }).init();
    });
  }
}
```

O id do conector (200) fica na página, junto do provider, e não no service, que é só o adaptador do SDK. Erros da API seguem o
`errorInterceptor` existente; erro do widget mostra toast "Não foi possível conectar o banco" e não chama a API.

Estado de carregamento: o botão fica em `loading` do clique até o widget abrir e de novo durante o `registerConnection`.

## 6. i18n

`public/i18n/integrations/pt-BR.json` (chaves principais):

```json
{
  "title": "Integrações",
  "subtitle": "Conecte seus bancos pelo Meu Pluggy.",
  "credentials": { "title": "Credenciais da Pluggy", "configured": "Configurado", "notConfigured": "Não configurado",
                   "secretFilled": "•••••• (já cadastrado)", "help": "…", "changeAppWarning": "…",
                   "save": "Salvar", "remove": "Remover integração", "removeConfirm": "…" },
  "fields": { "CLIENT_ID": "Client ID", "CLIENT_SECRET": "Client Secret" },
  "connections": { "title": "Bancos conectados", "connect": "Conectar banco", "count": "{{ count }} de {{ max }} bancos",
                   "unnamed": "Banco sem nome", "deleteConfirm": "…", "connected": "Banco conectado",
                   "widgetError": "Não foi possível conectar o banco" },
  "status": { "PENDING_SYNC": "Aguardando 1ª sincronização", "OK": "OK", "ERROR": "Erro" },
  "logs": { "title": "Histórico" },
  "operations": { "SAVE_CREDENTIALS": "Credenciais salvas", "CONNECT_TOKEN": "Abertura do widget",
                  "REGISTER_CONNECTION": "Banco conectado", "DELETE_CONNECTION": "Banco removido",
                  "DELETE_INTEGRATION": "Integração removida", "SYNC": "Sincronização" }
}
```

E `menu.integrations` em `public/i18n/pt-BR.json`.

## 7. Testes

Pelo critério do escopo §9 (só lógica): `PluggyConnectService` com o SDK mockado (`vi.mock('pluggy-connect-sdk')`):
`onSuccess` resolve o id; `onClose` sem sucesso resolve `null`; `onError` rejeita; `onClose` depois de `onSuccess` não altera
o resultado. Página e `IntegrationApiService` não são testados (repasse HTTP e template).

## 8. Atualizações no escopo do frontend

`docs/escopo-frontend.md`: feature `integrations` na estrutura (§3.1), rota e tela na §11, a dependência `pluggy-connect-sdk`
na stack (§2) e os testes do `PluggyConnectService` na §9.
