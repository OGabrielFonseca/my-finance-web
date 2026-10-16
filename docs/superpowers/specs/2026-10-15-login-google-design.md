# Login com conta Google — Design (frontend)

> 15/10/2026 · Status: **aguardando revisão** · Referência: `docs/escopo-frontend.md` ("escopo §N") e a spec do backend
> `my-finance-api/docs/superpowers/specs/2026-10-15-login-google-design.md` ("API §N").
>
> Só o front. Contrato, regras de vinculação e erros estão na spec da API. Refresh token continua para depois.

## 1. Objetivo

Botão **"Entrar com Google"** nas telas de login e cadastro. O usuário escolhe a conta Google num popup, o front recebe o
ID token (`credential`) do Google Identity Services (GIS) e troca por um token do MyFinance em `POST /auth/google`. A partir
daí a sessão é **idêntica** à do login por senha (mesmo `TokenResponse`, mesmo `localStorage`, mesmo timer de expiração).

Para o usuário não há diferença entre entrar, vincular e criar conta: a API decide (API §3) e responde sempre 200 com o token.

## 2. Decisões

| Tema | Decisão |
|---|---|
| Biblioteca | **Script oficial do GIS** (`https://accounts.google.com/gsi/client`), carregado sob demanda. **Sem dependência npm**: não há pacote oficial do Google e os wrappers da comunidade não acrescentam nada para um botão |
| Tipos | **Escritos à mão**, só o que é usado (`initialize`, `renderButton`, `CredentialResponse`), no próprio adaptador. Sem `@types/google.accounts` (mesmo espírito do escopo §5.4) |
| Adaptador | `GoogleIdentityService` é o **único arquivo** que toca `window.google`, como o `PluggyConnectService` com o SDK da Pluggy |
| Botão | **Botão renderizado pelo Google** (`renderButton`), não um `p-button` próprio: o fluxo de ID token só funciona pelo botão oficial ou pelo One Tap, e as regras de marca do Google exigem o visual dele |
| Modo | `ux_mode: 'popup'` (padrão). Sem redirect: a SPA não sai da tela e não precisa de rota de callback |
| One Tap | **Fora** (seção 9). Só o botão |
| Client ID | `environment.googleClientId`, **o mesmo valor** do `GOOGLE_CLIENT_ID` da API. Não é segredo e fica versionado. Vazio = o botão não aparece (o login por senha continua igual) |
| Onde | `/login` (texto "Fazer login com o Google") e `/register` (texto "Inscrever-se com o Google"). Os dois chamam o mesmo endpoint |
| Tema | Botão `outline` no tema claro e `filled_black` no escuro, re-renderizado quando o `ThemeService.isDark` muda |
| Falha ao carregar o script (bloqueador, offline) | O bloco do Google some (divisor incluído) e a tela fica só com o login por senha. Sem toast: não é erro do usuário. `console.warn` em dev |
| Erros da API | Mostrados **dentro do card**, abaixo do botão, como no formulário (sem toast): 401 `auth.INVALID_GOOGLE_TOKEN` e 422 `auth.GOOGLE_ACCOUNT_CONFLICT` mostram o `detail` da API. Status 0 e 5xx seguem o toast do `errorInterceptor` |

## 3. Estrutura

```
core/auth/
├── auth.model.ts                      # + GoogleLoginRequest
├── auth-api.service.ts                # + google(body, context)
├── auth-store.service.ts              # + loginWithGoogle(idToken, context)
└── google-identity.service.ts         # NOVO: adaptador do GIS (carrega o script, initialize, renderButton)

features/auth/
├── google-sign-in.component.ts        # NOVO: divisor "ou" + botão do Google + estado de carregamento/erro
├── login.page.html / .ts              # usa <app-google-sign-in text="signin_with">
└── register.page.html / .ts           # usa <app-google-sign-in text="signup_with">

environments/environment.ts            # + googleClientId
```

O adaptador fica em `core/auth` (infraestrutura de autenticação, usada pelo store); o componente fica em `features/auth`
porque só as duas telas de entrada usam.

## 4. Contrato e sessão

`auth.model.ts`:

```ts
export interface GoogleLoginRequest {
  idToken: string;
}
```

`AuthApiService`:

```ts
google(body: GoogleLoginRequest, context?: HttpContext): Observable<TokenResponse> {
  return this.http.post<TokenResponse>(`${environment.apiUrl}/auth/google`, body, { context });
}
```

`AuthStoreService` ganha um método no mesmo formato de `login`/`register`:

```ts
loginWithGoogle(idToken: string, context?: HttpContext): Observable<void> {
  return this.api.google({ idToken }, context).pipe(switchMap((token) => this.startFromToken(token)));
}
```

Nada mais muda na sessão: `startFromToken` grava o `localStorage`, arma o timer e carrega o `/me`.

**Interceptors:** nenhuma mudança. `/auth/google` está sob `/auth/`, então o `authInterceptor` não manda Bearer e o
`errorInterceptor` não encerra a sessão no 401; com `skipBusinessErrorToast()` o 422 também não vira toast.

## 5. `GoogleIdentityService` (adaptador)

```ts
/** Tipos mínimos do Google Identity Services (só o que este app usa). */
interface CredentialResponse { credential: string; }
export interface GoogleButtonOptions {
  theme: 'outline' | 'filled_black';
  text: 'signin_with' | 'signup_with';
  width: number;                                   // px, máx. 400 (limite do GIS)
}
interface GoogleAccountsId {
  initialize(config: { client_id: string; callback: (response: CredentialResponse) => void; ux_mode: 'popup' }): void;
  renderButton(parent: HTMLElement, options: Record<string, unknown>): void;
}
declare global { interface Window { google?: { accounts: { id: GoogleAccountsId } } } }

const GSI_SCRIPT = 'https://accounts.google.com/gsi/client';

/**
 * Adaptador do Google Identity Services. Único arquivo que toca window.google.
 * Carrega o script uma vez, inicializa com o client ID e renderiza o botão oficial.
 */
@Injectable({ providedIn: 'root' })
export class GoogleIdentityService {
  private readonly document = inject(DOCUMENT);
  private loading?: Promise<GoogleAccountsId>;
  private onCredential?: (idToken: string) => void;

  readonly enabled = environment.googleClientId !== '';

  async renderButton(parent: HTMLElement, options: GoogleButtonOptions, onCredential: (idToken: string) => void) {
    const gsi = await this.load();
    this.onCredential = onCredential;
    gsi.renderButton(parent, { type: 'standard', size: 'large', shape: 'rectangular', locale: 'pt-BR', ...options });
  }

  private load(): Promise<GoogleAccountsId> {
    this.loading ??= loadScript(this.document, GSI_SCRIPT)
      .then(() => {
        const gsi = this.document.defaultView!.google!.accounts.id;
        gsi.initialize({
          client_id: environment.googleClientId,
          callback: ({ credential }) => this.onCredential?.(credential),
          ux_mode: 'popup',
        });
        return gsi;
      })
      .catch((error: unknown) => {
        this.loading = undefined;                  // permite tentar de novo ao voltar para a tela
        throw error;
      });
    return this.loading;
  }
}

function loadScript(document: Document, src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => { script.remove(); reject(new Error(`Falha ao carregar ${src}`)); };
    document.head.appendChild(script);
  });
}
```

Pontos de atenção:
- O GIS deve ser **inicializado uma vez** por página e o `callback` é global. Por isso o service guarda o último
  `onCredential` registrado: só existe um botão na tela de cada vez (login **ou** cadastro), e quem renderizou por último recebe
  o token.
- Fora do bundle inicial: o script só é baixado quando `/login` ou `/register` abre e `enabled` é verdadeiro.
- Usa `DOCUMENT` injetado (e não `window`/`document` globais) para dar para testar com jsdom.

## 6. `GoogleSignInComponent`

```ts
@Component({
  selector: 'app-google-sign-in',
  imports: [Button, Divider, Message],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (available()) {
      <p-divider align="center"><span class="text-sm text-muted-color">ou</span></p-divider>

      <div class="flex flex-col gap-3">
        <!-- O GIS desenha um iframe aqui; escondido (não removido) durante o envio para não precisar re-renderizar. -->
        <div #button class="flex min-h-10 justify-center" [class.hidden]="signingIn()"></div>

        @if (signingIn()) {
          <p-button label="Entrando com o Google…" severity="secondary" [outlined]="true" [loading]="true" [fluid]="true" />
        }
        @if (error(); as message) {
          <p-message severity="error">{{ message }}</p-message>
        }
      </div>
    }
  `,
})
export class GoogleSignInComponent {
  readonly text = input<GoogleButtonOptions['text']>('signin_with');
  /** Sessão iniciada: a página decide para onde navegar. */
  readonly signedIn = output<void>();

  private readonly google = inject(GoogleIdentityService);
  private readonly auth = inject(AuthStoreService);
  private readonly theme = inject(ThemeService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly button = viewChild<ElementRef<HTMLElement>>('button');

  protected readonly available = signal(this.google.enabled);
  protected readonly signingIn = signal(false);
  protected readonly error = signal<string | null>(null);

  constructor() {
    // Renderiza depois que o contêiner existe e de novo quando o tema muda.
    effect(() => {
      const element = this.button()?.nativeElement;
      const theme = this.theme.isDark() ? 'filled_black' : 'outline';
      if (!element) return;
      const width = Math.min(element.parentElement?.clientWidth ?? 400, 400);
      this.google
        .renderButton(element, { theme, text: this.text(), width }, (idToken) => this.signIn(idToken))
        .catch((err: unknown) => {
          if (isDevMode()) console.warn('[google] GIS indisponível', err);
          this.available.set(false);
        });
    });
  }

  private signIn(idToken: string): void {
    if (this.signingIn()) return;
    this.signingIn.set(true);
    this.error.set(null);
    this.auth
      .loginWithGoogle(idToken, skipBusinessErrorToast())
      .pipe(finalize(() => this.signingIn.set(false)), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.signedIn.emit(),
        error: (err: unknown) => {
          if (err instanceof ApiError && (err.status === 401 || err.status === 422)) this.error.set(err.detail);
        },
      });
  }
}
```

- O callback do GIS chega por um script externo; com o app **zoneless**, a mudança nos signals já agenda a detecção de
  mudanças, então não precisa de `NgZone.run`.
- O botão do Google tem largura fixa em px (não é fluido): mede o contêiner na renderização, até o limite de 400 px do GIS.
  Não re-renderiza em resize (o card de login tem `max-w-sm` e não muda de largura na prática).

## 7. Telas

`login.page.html`, dentro do `<form>`, entre o botão "Entrar" e o link de cadastro:

```html
<p-button type="submit" [label]="'Entrar'" [loading]="submit.submitting()" [fluid]="true" />

<app-google-sign-in text="signin_with" (signedIn)="goToApp()" />

<a routerLink="/register" class="text-center text-sm text-primary">{{ 'Não tem conta? Cadastre-se' }}</a>
```

`login.page.ts`: `goToApp()` faz o mesmo `navigateByUrl(this.returnUrl() || '/dashboard')` do envio do formulário (extrair para
um método e usar nos dois).

`register.page.html`: igual, com `text="signup_with"` e `(signedIn)` navegando para `/dashboard`.

O botão do GIS não é `type="submit"` (é um iframe) e o `p-button` de carregamento é `type="button"` (padrão do PrimeNG), então
ficar dentro do `<form>` não dispara o envio.

Resultado visual (card de login):

```
┌────────────────────────────────────┐
│  MyFinance                         │
│  Entrar                            │
│  E-mail   [                    ]   │
│  Senha    [                    ]   │
│  [            Entrar            ]  │
│  ─────────────── ou ───────────────│
│  [ G  Fazer login com o Google  ]  │
│  [mensagem de erro, se houver]     │
│     Não tem conta? Cadastre-se     │
└────────────────────────────────────┘
```

## 8. Configuração e deploy

- **`environment.ts`:** `googleClientId: '<client-id>.apps.googleusercontent.com'` (o mesmo do backend).
- **Google Cloud Console** (cliente OAuth do tipo *Aplicativo da Web*): em *Origens JavaScript autorizadas*, cadastrar
  `http://localhost`, `http://localhost:4200` e o domínio de produção. **Não** precisa de URI de redirecionamento (modo popup).
  Tela de consentimento com os escopos padrão (`openid`, `email`, `profile`).
- **CSP** (escopo §5.5 prevê CSP no deploy): liberar
  `script-src https://accounts.google.com/gsi/client`, `frame-src https://accounts.google.com/gsi/`,
  `connect-src https://accounts.google.com/gsi/` e `style-src https://accounts.google.com/gsi/style`.
- **COOP:** se o servidor do front enviar `Cross-Origin-Opener-Policy`, usar `same-origin-allow-popups`; `same-origin` quebra a
  comunicação com o popup do Google.
- O proxy de dev (`/api` → `localhost:8080`) não muda: o front fala com o Google direto e com a API pelo proxy.

## 9. Fora do escopo

- **One Tap / login automático** (`prompt()`, `auto_select`): fica para depois; exigiria `disableAutoSelect()` no logout e
  tratar o FedCM do Chrome.
- **Mostrar no perfil** que a conta está vinculada ao Google ou desvincular: o `UserResponse` não muda (API §4).
- **Criar senha para conta só-Google:** o front ainda não tem as telas de troca/"Esqueci a senha". Quando tiver, o 422
  `user.PASSWORD_NOT_SET` da troca já aparece no formulário pelo `injectFormSubmit` (mostra o `detail` de 422), sem código novo.
- **Login por senha em conta só-Google:** a API responde o mesmo 401 `auth.INVALID_CREDENTIALS` de senha errada (API §6), e a
  tela já mostra esse `detail`. Não há dica específica de "use o Google" (seria revelar como a conta foi criada).

## 10. Testes

Pelo critério do escopo §9 (só lógica):

- `GoogleIdentityService` (jsdom, `window.google` falso preenchido no `onload` do script):
  duas chamadas de `renderButton` injetam **um** `<script>` e chamam `initialize` **uma** vez, com o `client_id` do environment;
  o `callback` do GIS entrega o `credential` ao último `onCredential` registrado; `onerror` do script rejeita, remove a tag e a
  chamada seguinte tenta carregar de novo.
- `AuthStoreService.loginWithGoogle`: envia `{ idToken }` para `POST /auth/google`, grava a sessão e carrega o `/me` (mesmo
  roteiro do teste de `login` existente, com `provideHttpClientTesting`).
- **Não testar:** `GoogleSignInComponent` e as páginas (template e repasse), `AuthApiService.google` (repasse HTTP).

## 11. Atualizações no escopo do frontend

`docs/escopo-frontend.md`:
- Cabeçalho: nova entrada de versão citando esta spec.
- §2 (Stack): linha "Login social": script do Google Identity Services carregado sob demanda, sem pacote npm; só
  `core/auth/google-identity.service.ts` toca `window.google`.
- §3.1: `google-identity.service.ts` em `core/auth` e `google-sign-in.component.ts` em `features/auth`.
- §5.5 (Autenticação): `POST /auth/google` devolve o mesmo `TokenResponse`; `AuthStoreService.loginWithGoogle()`; CSP e COOP
  necessários para o GIS.
- §9: testes do `GoogleIdentityService` e do `loginWithGoogle`.
- §11: linha `/login`, `/register` passa a citar `POST /auth/google`.
- §13: `googleClientId` no `environment.ts` e as origens autorizadas no Google Cloud Console.
