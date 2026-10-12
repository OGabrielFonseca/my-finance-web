# Fase 0a: Fundação — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Criar o projeto Angular 21 `my-finance-web` com lint, formatação, PrimeNG + tema claro/escuro, i18n, shell com menu e os tipos gerados da API.

**Architecture:** SPA Angular standalone e zoneless. `core/` guarda o que é singleton (tema, i18n, layout); `shared/` e `features/` chegam nos planos seguintes. O tema é o preset Aura customizado (Noir + `slate`) com modo escuro pela classe `.app-dark` no `<html>`. Textos vêm do Transloco (JSON em `public/i18n`).

**Tech Stack:** Angular 21.2, PrimeNG `~21.1.10`, `@primeuix/themes@^2`, Tailwind CSS v4 + `tailwindcss-primeui`, Transloco 8, `primelocale`, Vitest 4, ESLint (angular-eslint 21) + Prettier, Husky + lint-staged, `openapi-typescript` 7.

**Spec:** `docs/superpowers/specs/2026-10-12-fundacao-e-prototipo-design.md` (escopo de referência: `docs/escopo-frontend.md` v0.2)

**Sequência dos planos:** este é o 1º de 4. Depois: `2026-10-12-fase-0b1-camada-base.md`, `2026-10-12-fase-0b2-api-mock.md`, `2026-10-12-fase-0b3-telas.md`.

## Global Constraints

- Diretório do projeto: `C:\Users\gabri\WorkSpace\my-finance\my-finance-web` (já é repositório git, branch `main`, com `docs/`).
- **npm 11** (o npm 10.9.3 desta máquina quebra no `npm install` com `Cannot read properties of null (reading 'edgesOut')`). Ver Task 0.
- **PrimeNG fixo em `~21.1.10`**; nunca 22 (licença comercial). **`@primeuix/themes@^2.0.3`** (a linha 3.x é do PrimeNG 22 e depende de `@primeuix/styled@^1`, incompatível).
- Tudo standalone, `ChangeDetectionStrategy.OnPush`, `inject()`, `input()`/`output()`/`model()`, control flow `@if`/`@for`. Sem `NgModule` próprio.
- Nenhum texto fixo em template: tudo via Transloco (`| transloco`). Exceção: dados vindos da API.
- Cor só por token: `var(--p-...)`, `var(--app-...)` ou utilitários do `tailwindcss-primeui` (`bg-surface-0`, `text-muted-color`, `border-surface`, `bg-emphasis`, `rounded-border`). Nada de hexadecimal em componente.
- Seletores com prefixo `app` (componentes `kebab-case`, diretivas `camelCase`).
- Nomes de arquivos: `*.page.ts` (rota), `*.component.ts`, `*.service.ts`, `*.api.ts`, `*.model.ts`, `*.store.ts`, `*.routes.ts`, `*.spec.ts`. Classes: `XxxPage`, `XxxComponent`, `XxxService`.
- Aliases: `@core/*`, `@shared/*`, `@features/*`, `@api/*`, `@env/*`. Sem `../../..` entre camadas.
- Commits em português, Conventional Commits (`feat(core): ...`, `chore: ...`), terminando com a linha `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Testes: Vitest, só lógica (sem testes de template).

---

### Task 0: Pré-requisitos do ambiente

**Files:** nenhum.

- [ ] **Step 1: Conferir versões**

Run: `node -v; npm -v; git -C C:/Users/gabri/WorkSpace/my-finance/my-finance-web status --short`
Expected: Node `v22.x`; working tree limpo.

- [ ] **Step 2: Garantir npm 11**

Se `npm -v` mostrar 10.x, **pedir aprovação ao usuário** para instalar globalmente (`npm install -g npm@11`), porque muda o ambiente da máquina. Se o usuário recusar, usar `npx -y npm@11` no lugar de `npm` em todos os comandos de instalação deste plano (ex.: `npx -y npm@11 install ...`). Scripts (`npm run ...`) funcionam com qualquer versão.

Run (depois de aprovado): `npm install -g npm@11 && npm -v`
Expected: `11.x`

- [ ] **Step 3: Avisar sobre a Task 6**

A Task 6 precisa da API rodando (Postgres via Docker). Verificar `docker info` e, se falhar, pedir ao usuário que abra o Docker Desktop antes de chegar na Task 6. As Tasks 1 a 5 não dependem disso.

---

### Task 1: Criar o projeto Angular

**Files:**
- Create (gerados): `angular.json`, `package.json`, `tsconfig*.json`, `src/**`, `public/favicon.ico`, `.editorconfig`, `.gitignore`, `.prettierrc`, `.vscode/*`, `README.md`
- Create: `.gitattributes`, `proxy.conf.json`, `src/environments/environment.ts`
- Modify: `tsconfig.json`, `package.json`, `src/app/app.ts`, `src/index.html`, `.editorconfig`
- Delete: `src/app/app.html`, `src/app/app.css`, `src/app/app.spec.ts`

**Interfaces:**
- Produces: `environment` (`src/environments/environment.ts`) com `{ apiUrl: '/api/v1', useMockApi: false }`; aliases de import; script `npm start` com proxy.

- [ ] **Step 1: Gerar o workspace na pasta atual**

Run (na pasta `my-finance-web`):
```bash
npx -y @angular/cli@21 new my-finance-web --directory . --style=tailwind --routing --ssr=false --zoneless --test-runner=vitest --ai-config=none --skip-git --skip-install --package-manager=npm
```
Expected: lista de `CREATE ...`; `docs/` e `.git/` continuam intactos.

- [ ] **Step 2: Instalar dependências**

Run: `npm install`
Expected: termina sem `npm error`. (Avisos `install-scripts` do npm 11 sobre `@parcel/watcher` podem ser ignorados.)

- [ ] **Step 3: Fixar fim de linha LF**

Create `.gitattributes`:
```
* text=auto eol=lf
*.ico binary
*.png binary
```

Em `.editorconfig`, logo abaixo de `[*]`, adicionar a linha `end_of_line = lf`.

- [ ] **Step 4: Aliases no `tsconfig.json`**

Em `tsconfig.json`, dentro de `compilerOptions`, adicionar:
```json
"paths": {
  "@core/*": ["./src/app/core/*"],
  "@shared/*": ["./src/app/shared/*"],
  "@features/*": ["./src/app/features/*"],
  "@api/*": ["./src/api/*"],
  "@env/*": ["./src/environments/*"]
}
```

- [ ] **Step 5: Environment e proxy**

Create `src/environments/environment.ts`:
```ts
export const environment = {
  apiUrl: '/api/v1',
  useMockApi: false,
};
```

Create `proxy.conf.json`:
```json
{
  "/api": { "target": "http://localhost:8080", "secure": false }
}
```

Em `package.json`, trocar o script `start` por:
```json
"start": "ng serve --proxy-config proxy.conf.json",
```

- [ ] **Step 6: App raiz mínima**

Delete `src/app/app.html`, `src/app/app.css` e `src/app/app.spec.ts`.

Replace `src/app/app.ts`:
```ts
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<router-outlet />`,
})
export class App {}
```

Em `src/index.html`: trocar `<html lang="en">` por `<html lang="pt-BR">` e o `<title>` por `<title>MyFinance</title>`.

- [ ] **Step 7: Verificar o build**

Run: `npm run build`
Expected: `Application bundle generation complete.` sem erros.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "chore: cria projeto Angular 21 com Tailwind, Vitest e aliases

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Lint, Prettier e Husky

**Files:**
- Create: `eslint.config.js` (via `ng add`, depois substituído), `.prettierignore`, `.husky/pre-commit`
- Modify: `.prettierrc`, `package.json`, `angular.json` (via `ng add`)

**Interfaces:**
- Produces: `npm run lint`, `npm run format`; pre-commit rodando `lint-staged`. Regra `no-restricted-imports` bloqueando `@features/<nome>/<interno>`.

- [ ] **Step 1: Instalar**

Run:
```bash
npx ng add angular-eslint@21 --skip-confirmation
npm install -D eslint-config-prettier prettier-plugin-tailwindcss husky lint-staged
```
Expected: `eslint.config.js` criado e target `lint` adicionado ao `angular.json`.

- [ ] **Step 2: Substituir `eslint.config.js`**

```js
// @ts-check
const eslint = require('@eslint/js');
const { defineConfig } = require('eslint/config');
const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');
const prettier = require('eslint-config-prettier/flat');

module.exports = defineConfig([
  { ignores: ['src/api/schema.d.ts', 'dist/', '.angular/'] },
  {
    files: ['**/*.ts'],
    extends: [
      eslint.configs.recommended,
      tseslint.configs.strict,
      tseslint.configs.stylistic,
      angular.configs.tsRecommended,
    ],
    processor: angular.processInlineTemplates,
    rules: {
      '@angular-eslint/component-selector': ['error', { type: 'element', prefix: 'app', style: 'kebab-case' }],
      '@angular-eslint/directive-selector': ['error', { type: 'attribute', prefix: 'app', style: 'camelCase' }],
      '@angular-eslint/prefer-on-push-component-change-detection': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-extraneous-class': ['error', { allowWithDecorator: true }],
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['@features/*/*'], message: 'Importe pela API pública da feature (@features/<nome>).' },
          ],
        },
      ],
    },
  },
  {
    files: ['**/*.html'],
    extends: [angular.configs.templateRecommended, angular.configs.templateAccessibility],
    rules: { '@angular-eslint/template/prefer-control-flow': 'error' },
  },
  prettier,
]);
```

- [ ] **Step 3: Prettier**

Replace `.prettierrc`:
```json
{
  "singleQuote": true,
  "printWidth": 120,
  "trailingComma": "all",
  "plugins": ["prettier-plugin-tailwindcss"],
  "tailwindStylesheet": "./src/styles.css",
  "overrides": [{ "files": "*.html", "options": { "parser": "angular" } }]
}
```

Create `.prettierignore`:
```
docs/
dist/
.angular/
package-lock.json
src/api/schema.d.ts
```

- [ ] **Step 4: Scripts e lint-staged no `package.json`**

Adicionar em `scripts`:
```json
"lint": "ng lint",
"format": "prettier --write ."
```

Adicionar no nível raiz:
```json
"lint-staged": {
  "*.{ts,html}": ["eslint --fix", "prettier --write"],
  "*.{css,json}": ["prettier --write"]
}
```

- [ ] **Step 5: Husky**

Run: `npx husky init`
Expected: cria `.husky/pre-commit` e o script `"prepare": "husky"`.

Replace `.husky/pre-commit`:
```
npx lint-staged
```

- [ ] **Step 6: Formatar e rodar o lint**

Run: `npm run format && npm run lint`
Expected: `All files pass linting.`

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: configura ESLint, Prettier, Husky e lint-staged

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
Expected: o hook `lint-staged` roda e o commit passa.

---

### Task 3: PrimeNG, preset e `ThemeService`

**Files:**
- Create: `src/app/core/theme/my-finance.preset.ts`, `src/app/core/theme/theme.service.ts`, `src/app/core/theme/theme.service.spec.ts`
- Modify: `src/app/app.config.ts`, `src/styles.css`, `angular.json`

**Interfaces:**
- Produces:
  - `type ThemePreference = 'light' | 'dark' | 'system'`
  - `const THEME_STORAGE_KEY = 'mf.theme'`
  - `ThemeService` (root): `preference: Signal<ThemePreference>`, `isDark: Signal<boolean>`, `setPreference(p: ThemePreference): void`
  - Variáveis CSS `--app-income`, `--app-expense`, `--app-transfer`

- [ ] **Step 1: Instalar**

Run: `npm install primeng@~21.1.10 @primeuix/themes@^2.0.3 primeicons @angular/cdk@^21 tailwindcss-primeui`
Expected: `package.json` com `"primeng": "~21.1.10"` e `"@primeuix/themes": "^2.0.3"`. Se o npm gravar `^21...` para o primeng, editar manualmente para `~21.1.10`.

- [ ] **Step 2: Escrever o teste do `ThemeService`**

Create `src/app/core/theme/theme.service.spec.ts`:
```ts
import { TestBed } from '@angular/core/testing';
import { THEME_STORAGE_KEY, ThemeService } from './theme.service';

type Listener = (event: MediaQueryListEvent) => void;

/** jsdom não tem matchMedia: simula o "prefers-color-scheme" e devolve uma função para mudá-lo. */
function mockSystemDark(matches: boolean): (dark: boolean) => void {
  const listeners: Listener[] = [];
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: () => ({ matches, addEventListener: (_type: string, listener: Listener) => listeners.push(listener) }),
  });
  return (dark) => listeners.forEach((listener) => listener({ matches: dark } as MediaQueryListEvent));
}

const hasDarkClass = () => document.documentElement.classList.contains('app-dark');

describe('ThemeService', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('app-dark');
  });

  it('usa a preferência do sistema por padrão', () => {
    mockSystemDark(true);
    const service = TestBed.inject(ThemeService);
    TestBed.tick();

    expect(service.preference()).toBe('system');
    expect(service.isDark()).toBe(true);
    expect(hasDarkClass()).toBe(true);
  });

  it('acompanha a mudança do sistema quando a preferência é "system"', () => {
    const setSystemDark = mockSystemDark(false);
    const service = TestBed.inject(ThemeService);

    setSystemDark(true);
    TestBed.tick();

    expect(service.isDark()).toBe(true);
    expect(hasDarkClass()).toBe(true);
  });

  it('grava a preferência escolhida e aplica a classe', () => {
    mockSystemDark(true);
    const service = TestBed.inject(ThemeService);

    service.setPreference('light');
    TestBed.tick();

    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
    expect(service.isDark()).toBe(false);
    expect(hasDarkClass()).toBe(false);
  });

  it('lê a preferência salva', () => {
    mockSystemDark(false);
    localStorage.setItem(THEME_STORAGE_KEY, 'dark');

    expect(TestBed.inject(ThemeService).isDark()).toBe(true);
  });

  it('ignora valor inválido no storage', () => {
    mockSystemDark(false);
    localStorage.setItem(THEME_STORAGE_KEY, 'azul');

    expect(TestBed.inject(ThemeService).preference()).toBe('system');
  });
});
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `npm test -- --watch=false`
Expected: FAIL (`Cannot find module './theme.service'` ou equivalente).

- [ ] **Step 4: Implementar o `ThemeService`**

Create `src/app/core/theme/theme.service.ts`:
```ts
import { DOCUMENT, Injectable, computed, effect, inject, signal } from '@angular/core';

export type ThemePreference = 'light' | 'dark' | 'system';

export const THEME_STORAGE_KEY = 'mf.theme';
const DARK_CLASS = 'app-dark';

/** Preferência de tema (claro, escuro ou do sistema), salva no localStorage e aplicada como classe no <html>. */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly media = this.document.defaultView?.matchMedia?.('(prefers-color-scheme: dark)');
  private readonly systemDark = signal(this.media?.matches ?? false);
  private readonly preferenceState = signal<ThemePreference>(readPreference());

  readonly preference = this.preferenceState.asReadonly();
  readonly isDark = computed(() => {
    const preference = this.preferenceState();
    return preference === 'dark' || (preference === 'system' && this.systemDark());
  });

  constructor() {
    this.media?.addEventListener('change', (event) => this.systemDark.set(event.matches));
    effect(() => this.document.documentElement.classList.toggle(DARK_CLASS, this.isDark()));
  }

  setPreference(preference: ThemePreference): void {
    this.preferenceState.set(preference);
    localStorage.setItem(THEME_STORAGE_KEY, preference);
  }
}

function readPreference(): ThemePreference {
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  return stored === 'light' || stored === 'dark' ? stored : 'system';
}
```

- [ ] **Step 5: Rodar e ver passar**

Run: `npm test -- --watch=false`
Expected: PASS (5 testes).

- [ ] **Step 6: Preset**

Create `src/app/core/theme/my-finance.preset.ts`:
```ts
import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';

const slate = {
  50: '{slate.50}',
  100: '{slate.100}',
  200: '{slate.200}',
  300: '{slate.300}',
  400: '{slate.400}',
  500: '{slate.500}',
  600: '{slate.600}',
  700: '{slate.700}',
  800: '{slate.800}',
  900: '{slate.900}',
  950: '{slate.950}',
};

/** Aura com primária monocromática (Noir) sobre surface slate. */
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
          background: 'rgba(248, 250, 252, .16)',
          focusBackground: 'rgba(248, 250, 252, .24)',
          color: 'rgba(255, 255, 255, .87)',
          focusColor: 'rgba(255, 255, 255, .87)',
        },
      },
    },
  },
});
```

- [ ] **Step 7: Registrar o PrimeNG**

Replace `src/app/app.config.ts`:
```ts
import { provideHttpClient, withFetch } from '@angular/common/http';
import type { ApplicationConfig } from '@angular/core';
import { provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { providePrimeNG } from 'primeng/config';

import { routes } from './app.routes';
import { MyFinancePreset } from './core/theme/my-finance.preset';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withFetch()),
    providePrimeNG({
      theme: {
        preset: MyFinancePreset,
        options: {
          darkModeSelector: '.app-dark',
          cssLayer: { name: 'primeng', order: 'theme, base, primeng' },
        },
      },
      ripple: false,
    }),
  ],
};
```

- [ ] **Step 8: Estilos globais**

Replace `src/styles.css`:
```css
@import 'tailwindcss';
@import 'tailwindcss-primeui';

@custom-variant dark (&:where(.app-dark, .app-dark *));

/* Cores com significado financeiro (fora do preset monocromático). */
:root {
  --app-income: var(--p-green-600);
  --app-expense: var(--p-red-600);
  --app-transfer: var(--p-blue-600);
}

.app-dark {
  --app-income: var(--p-green-400);
  --app-expense: var(--p-red-400);
  --app-transfer: var(--p-blue-400);
}

html {
  font-size: 14px;
}

body {
  margin: 0;
  font-family: Inter, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  background: var(--p-surface-50);
  color: var(--p-text-color);
}

.app-dark body {
  background: var(--p-surface-950);
}
```

Em `angular.json`, no `build.options.styles`, colocar o PrimeIcons antes do `styles.css`:
```json
"styles": ["node_modules/primeicons/primeicons.css", "src/styles.css"]
```

- [ ] **Step 9: Verificar**

Run: `npm run lint && npm test -- --watch=false && npm run build`
Expected: tudo passa.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat(core): adiciona PrimeNG com preset Noir/slate e ThemeService

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: i18n (Transloco, `primelocale`, locale pt-BR)

**Files:**
- Create: `src/app/core/i18n/transloco-http.loader.ts`, `src/app/core/i18n/i18n.providers.ts`, `public/i18n/pt-BR.json`
- Modify: `src/app/app.config.ts`

**Interfaces:**
- Produces: `provideI18n()`; `LOCALE_ID = 'pt-BR'`, `DEFAULT_CURRENCY_CODE = 'BRL'` (então `| currency` e `| date` já saem em pt-BR/BRL); arquivo global de traduções com **todas** as chaves globais usadas nos planos 0b (as features terão escopos próprios no plano 0b3).

- [ ] **Step 1: Instalar**

Run: `npm install @jsverse/transloco primelocale`

- [ ] **Step 2: Loader**

Create `src/app/core/i18n/transloco-http.loader.ts`:
```ts
import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { Translation, TranslocoLoader } from '@jsverse/transloco';

/** Carrega public/i18n/<lang>.json; escopos chegam como "<escopo>/<lang>". */
@Injectable({ providedIn: 'root' })
export class TranslocoHttpLoader implements TranslocoLoader {
  private readonly http = inject(HttpClient);

  getTranslation(lang: string) {
    return this.http.get<Translation>(`/i18n/${lang}.json`);
  }
}
```

- [ ] **Step 3: Providers de i18n**

Create `src/app/core/i18n/i18n.providers.ts`:
```ts
import { registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';
import type { EnvironmentProviders, Provider } from '@angular/core';
import { DEFAULT_CURRENCY_CODE, LOCALE_ID, inject, isDevMode, provideAppInitializer } from '@angular/core';
import { TranslocoService, provideTransloco } from '@jsverse/transloco';
import { PrimeNG } from 'primeng/config';
import { pt_BR } from 'primelocale/js/pt_BR.js';
import { firstValueFrom } from 'rxjs';

import { TranslocoHttpLoader } from './transloco-http.loader';

export const DEFAULT_LANG = 'pt-BR';

/** Traduções dos componentes do PrimeNG por idioma do app. */
const PRIME_LOCALES: Record<string, typeof pt_BR> = { 'pt-BR': pt_BR };

export function provideI18n(): (Provider | EnvironmentProviders)[] {
  registerLocaleData(localePt, DEFAULT_LANG);

  return [
    { provide: LOCALE_ID, useValue: DEFAULT_LANG },
    { provide: DEFAULT_CURRENCY_CODE, useValue: 'BRL' },
    provideTransloco({
      config: {
        availableLangs: [DEFAULT_LANG],
        defaultLang: DEFAULT_LANG,
        fallbackLang: DEFAULT_LANG,
        reRenderOnLangChange: true,
        prodMode: !isDevMode(),
      },
      loader: TranslocoHttpLoader,
    }),
    provideAppInitializer(() => {
      const transloco = inject(TranslocoService);
      const primeng = inject(PrimeNG);
      transloco.langChanges$.subscribe((lang) => primeng.setTranslation(PRIME_LOCALES[lang] ?? pt_BR));
      // Garante os textos globais antes da primeira tela.
      return firstValueFrom(transloco.load(DEFAULT_LANG));
    }),
  ];
}
```

- [ ] **Step 4: Registrar no `app.config.ts`**

Em `src/app/app.config.ts`, importar `import { provideI18n } from './core/i18n/i18n.providers';` e adicionar `...provideI18n(),` no fim do array `providers`.

- [ ] **Step 5: Traduções globais**

Create `public/i18n/pt-BR.json`:
```json
{
  "app": { "name": "MyFinance" },
  "menu": {
    "label": "Menu principal",
    "open": "Abrir menu",
    "dashboard": "Dashboard",
    "transactions": "Lançamentos",
    "accounts": "Contas",
    "categories": "Categorias"
  },
  "theme": { "label": "Tema", "light": "Claro", "dark": "Escuro", "system": "Sistema" },
  "user": { "menu": "Menu do usuário", "logout": "Sair", "expireSession": "Expirar sessão (mock)" },
  "common": {
    "new": "Novo",
    "save": "Salvar",
    "cancel": "Cancelar",
    "edit": "Editar",
    "archive": "Arquivar",
    "delete": "Excluir",
    "archived": "Arquivado",
    "onlyArchived": "Somente arquivados",
    "actions": "Ações",
    "filters": "Filtros",
    "clearFilters": "Limpar filtros",
    "all": "Todos",
    "select": "Selecione",
    "yes": "Sim",
    "no": "Não",
    "noResults": "Nenhum registro encontrado.",
    "confirm": {
      "archive": { "header": "Arquivar", "message": "Arquivar \"{{ name }}\"?" },
      "delete": { "header": "Excluir", "message": "Excluir \"{{ name }}\"? Esta ação não pode ser desfeita." }
    },
    "success": {
      "saved": "Salvo com sucesso.",
      "archive": "Arquivado com sucesso.",
      "delete": "Excluído com sucesso."
    }
  },
  "validation": {
    "required": "Campo obrigatório",
    "maxlength": "Máximo de {{ requiredLength }} caracteres",
    "minlength": "Mínimo de {{ requiredLength }} caracteres",
    "min": "Valor mínimo: {{ min }}",
    "email": "E-mail inválido",
    "pattern": "Formato inválido",
    "invalid": "Valor inválido"
  },
  "enums": {
    "accountType": {
      "CHECKING": "Conta corrente",
      "SAVINGS": "Poupança",
      "WALLET": "Carteira",
      "INVESTMENT": "Investimentos",
      "OTHER": "Outra"
    },
    "categoryType": { "INCOME": "Receita", "EXPENSE": "Despesa" },
    "transactionType": { "INCOME": "Receita", "EXPENSE": "Despesa", "TRANSFER": "Transferência" },
    "transactionStatus": { "PENDING": "Pendente", "CLEARED": "Efetivado" }
  },
  "errors": {
    "title": "Erro",
    "unexpected": "Erro inesperado. Tente novamente.",
    "network": "Sem conexão com o servidor.",
    "sessionExpired": "Sua sessão expirou. Entre novamente.",
    "notFound": {
      "title": "Página não encontrada",
      "message": "O endereço acessado não existe.",
      "back": "Ir para o dashboard"
    }
  }
}
```

- [ ] **Step 6: Verificar**

Run: `npm run lint && npm test -- --watch=false && npm run build`
Expected: tudo passa. Se o `import { pt_BR } from 'primelocale/js/pt_BR.js'` não resolver, conferir `node_modules/primelocale/js/` (o arquivo é `pt_BR.js` e exporta `pt_BR`).

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(core): configura Transloco, primelocale e locale pt-BR

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Shell, menu, alternância de tema e página 404

**Files:**
- Create: `src/app/core/layout/menu.ts`, `src/app/core/layout/shell.component.ts`, `src/app/core/layout/shell.component.html`, `src/app/core/layout/theme-toggle.component.ts`, `src/app/core/layout/not-found.page.ts`
- Modify: `src/app/app.routes.ts`

**Interfaces:**
- Consumes: `ThemeService` (Task 3), chaves `menu.*`, `theme.*`, `errors.notFound.*` (Task 4).
- Produces:
  - `interface MenuEntry { label: string; icon: string; route: string }` e `MENU: readonly MenuEntry[]`
  - `ShellComponent` (`app-shell`): layout roteado com `<router-outlet />`. O plano 0b3 acrescenta o menu do usuário nele.
  - `NotFoundPage` (`app-not-found-page`)
  - `routes` com o shell na raiz e `**` → `NotFoundPage`

- [ ] **Step 1: Itens do menu**

Create `src/app/core/layout/menu.ts`:
```ts
export interface MenuEntry {
  label: string; // chave i18n
  icon: string; // classe do PrimeIcons
  route: string;
}

export const MENU: readonly MenuEntry[] = [
  { label: 'menu.dashboard', icon: 'pi pi-chart-pie', route: '/dashboard' },
  { label: 'menu.transactions', icon: 'pi pi-list', route: '/transactions' },
  { label: 'menu.accounts', icon: 'pi pi-wallet', route: '/accounts' },
  { label: 'menu.categories', icon: 'pi pi-tags', route: '/categories' },
];
```

- [ ] **Step 2: Alternância de tema**

Create `src/app/core/layout/theme-toggle.component.ts`:
```ts
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';
import { SelectButton } from 'primeng/selectbutton';

import type { ThemePreference } from '../theme/theme.service';
import { ThemeService } from '../theme/theme.service';

interface ThemeOption {
  value: ThemePreference;
  icon: string;
}

@Component({
  selector: 'app-theme-toggle',
  imports: [FormsModule, SelectButton, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div role="group" [attr.aria-label]="'theme.label' | transloco">
      <p-selectbutton
        [options]="options"
        [ngModel]="theme.preference()"
        (ngModelChange)="theme.setPreference($event)"
        optionValue="value"
        [allowEmpty]="false"
        size="small"
      >
        <ng-template #item let-option>
          <i [class]="option.icon" [attr.aria-label]="'theme.' + option.value | transloco"></i>
        </ng-template>
      </p-selectbutton>
    </div>
  `,
})
export class ThemeToggleComponent {
  protected readonly theme = inject(ThemeService);
  protected readonly options: ThemeOption[] = [
    { value: 'light', icon: 'pi pi-sun' },
    { value: 'dark', icon: 'pi pi-moon' },
    { value: 'system', icon: 'pi pi-desktop' },
  ];
}
```

- [ ] **Step 3: Shell**

Create `src/app/core/layout/shell.component.ts`:
```ts
import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { Button } from 'primeng/button';
import { Drawer } from 'primeng/drawer';

import { MENU } from './menu';
import { ThemeToggleComponent } from './theme-toggle.component';

@Component({
  selector: 'app-shell',
  imports: [
    NgTemplateOutlet,
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    TranslocoPipe,
    Button,
    Drawer,
    ThemeToggleComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './shell.component.html',
})
export class ShellComponent {
  protected readonly menu = MENU;
  protected readonly menuOpen = signal(false);
}
```

Create `src/app/core/layout/shell.component.html`:
```html
<div class="flex min-h-screen flex-col">
  <header
    class="sticky top-0 z-10 flex h-14 items-center gap-3 border-b border-surface bg-surface-0 px-4 dark:bg-surface-900"
  >
    <p-button
      class="lg:hidden"
      icon="pi pi-bars"
      severity="secondary"
      [text]="true"
      [ariaLabel]="'menu.open' | transloco"
      (onClick)="menuOpen.set(true)"
    />
    <a routerLink="/dashboard" class="text-lg font-semibold no-underline text-color">{{ 'app.name' | transloco }}</a>
    <span class="flex-1"></span>
    <app-theme-toggle />
  </header>

  <div class="flex flex-1">
    <aside class="hidden w-60 shrink-0 border-r border-surface bg-surface-0 p-3 lg:block dark:bg-surface-900">
      <ng-container *ngTemplateOutlet="nav" />
    </aside>
    <main class="min-w-0 flex-1 p-4 lg:p-6">
      <router-outlet />
    </main>
  </div>
</div>

<p-drawer [(visible)]="menuOpen" [header]="'app.name' | transloco">
  <ng-container *ngTemplateOutlet="nav" />
</p-drawer>

<ng-template #nav>
  <nav [attr.aria-label]="'menu.label' | transloco">
    <ul class="m-0 flex list-none flex-col gap-1 p-0">
      @for (item of menu; track item.route) {
        <li>
          <a
            [routerLink]="item.route"
            routerLinkActive="bg-emphasis font-semibold"
            class="flex items-center gap-3 rounded-border px-3 py-2 no-underline text-color hover:bg-emphasis"
            (click)="menuOpen.set(false)"
          >
            <i [class]="item.icon"></i>
            {{ item.label | transloco }}
          </a>
        </li>
      }
    </ul>
  </nav>
</ng-template>
```

- [ ] **Step 4: Página 404**

Create `src/app/core/layout/not-found.page.ts`:
```ts
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { ButtonDirective, ButtonLabel } from 'primeng/button';

@Component({
  selector: 'app-not-found-page',
  imports: [RouterLink, TranslocoPipe, ButtonDirective, ButtonLabel],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="flex flex-col items-center gap-3 py-16 text-center">
      <i class="pi pi-compass text-5xl text-muted-color"></i>
      <h1 class="m-0 text-2xl font-semibold">{{ 'errors.notFound.title' | transloco }}</h1>
      <p class="m-0 text-muted-color">{{ 'errors.notFound.message' | transloco }}</p>
      <a pButton routerLink="/dashboard">
        <span pButtonLabel>{{ 'errors.notFound.back' | transloco }}</span>
      </a>
    </section>
  `,
})
export class NotFoundPage {}
```

(Em links com `pButton`, o texto vai em `<span pButtonLabel>`; o input `label` da diretiva está deprecated no PrimeNG 21.)

- [ ] **Step 5: Rotas**

Replace `src/app/app.routes.ts`:
```ts
import type { Routes } from '@angular/router';

import { NotFoundPage } from './core/layout/not-found.page';
import { ShellComponent } from './core/layout/shell.component';

export const routes: Routes = [
  {
    path: '',
    component: ShellComponent,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      { path: '**', component: NotFoundPage },
    ],
  },
];
```

(As rotas das features e os guards entram no plano 0b3. Até lá, os itens do menu caem na 404 dentro do shell, o que já valida a página.)

- [ ] **Step 6: Verificar**

Run: `npm run lint && npm test -- --watch=false && npm run build`
Expected: tudo passa.

Conferência visual (se houver ferramenta de navegador): `npm start`, abrir `http://localhost:4200`. Esperado: topbar com "MyFinance" e alternância de tema funcionando (classe `app-dark` no `<html>`); menu lateral em ≥1024 px e drawer pelo botão ☰ em 375 px; qualquer rota mostra a 404 traduzida dentro do shell. Encerrar o `ng serve` depois.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(core): adiciona shell com menu, alternância de tema e página 404

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Tipos gerados da API

**Files:**
- Create: `src/api/schema.d.ts` (gerado), `src/api/api-types.ts`, `src/api/api-types.spec.ts`
- Modify: `package.json`

**Interfaces:**
- Produces:
  - `src/api/schema.d.ts` com `components['schemas']` do springdoc
  - `type ApiSchema<K>` = schema bruto (use para **requests**: campos opcionais refletem `@NotNull`/`@NotBlank` do backend)
  - `type ApiResponse<K, N = never>` = schema de **resposta** sem `?` (o Jackson serializa todos os campos); os campos listados em `N` ficam `| null`

- [ ] **Step 1: Instalar e criar o script**

Run: `npm install -D openapi-typescript`

Em `package.json` → `scripts`:
```json
"api:types": "openapi-typescript http://localhost:8080/v3/api-docs -o src/api/schema.d.ts"
```

- [ ] **Step 2: Subir a API**

Pré-requisito: Docker Desktop aberto (`docker info` sem erro). Se não estiver, **parar e pedir ao usuário** para abri-lo.

Run (em outro terminal ou em background):
```bash
cd ../my-finance-api
docker compose up -d
java -jar target/my-finance-api-0.0.1-SNAPSHOT.jar --spring.profiles.active=dev
```
Se o jar não existir, usar `./mvnw spring-boot:run -Dspring-boot.run.profiles=dev`. **Não** alterar nada no repositório do backend (ele pode ter mudanças locais do usuário).

Esperar até `curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/v3/api-docs` devolver `200`.

- [ ] **Step 3: Gerar os tipos**

Run: `npm run api:types`
Expected: `src/api/schema.d.ts` criado.

Conferir os nomes dos schemas usados nos planos seguintes:
```bash
grep -oE "^\s+(AccountResponse|AccountSummary|AccountBalanceResponse|CreateAccountRequest|UpdateAccountRequest|CategoryResponse|CategorySummary|CreateCategoryRequest|UpdateCategoryRequest|TransactionResponse|CreateTransactionRequest|UpdateTransactionRequest|CreateTransferRequest|DashboardSummaryResponse|ExpensesByCategoryResponse|CategoryExpense|TokenResponse|LoginRequest|RegisterRequest|UserResponse|UpdateMeRequest):" src/api/schema.d.ts | sort -u
```
Expected: os 21 nomes. Se algum vier diferente (ex.: o record aninhado `CategoryExpense` com outro nome), anotar o nome real e usá-lo nos planos 0b2/0b3 no lugar do nome previsto.

Encerrar a API (Ctrl+C no `java`); o Postgres pode continuar rodando.

- [ ] **Step 4: Escrever o teste de tipos**

Create `src/api/api-types.spec.ts`:
```ts
import { expectTypeOf } from 'vitest';

import type { ApiResponse, ApiSchema } from './api-types';

type Account = ApiResponse<'AccountResponse', 'institution'>;

describe('ApiResponse', () => {
  it('remove o opcional dos campos de resposta', () => {
    expectTypeOf<Account['id']>().toEqualTypeOf<string>();
    expectTypeOf<Account['archived']>().toEqualTypeOf<boolean>();
  });

  it('mantém null só nos campos declarados', () => {
    expectTypeOf<Account['institution']>().toEqualTypeOf<string | null>();
  });

  it('ApiSchema mantém o schema bruto (requests)', () => {
    expectTypeOf<ApiSchema<'CreateAccountRequest'>['name']>().toEqualTypeOf<string>();
  });
});
```

- [ ] **Step 5: Rodar e ver falhar**

Run: `npm test -- --watch=false`
Expected: FAIL (`Cannot find module './api-types'`).

- [ ] **Step 6: Implementar**

Create `src/api/api-types.ts`:
```ts
import type { components } from './schema';

type Schemas = components['schemas'];

/** Schema como gerado. Use para requests: os opcionais refletem @NotNull/@NotBlank do backend. */
export type ApiSchema<K extends keyof Schemas> = Schemas[K];

/**
 * Schema de resposta. O springdoc marca como opcionais os campos sem anotação, mas o Jackson serializa todos;
 * então nenhum campo é ausente. Os que podem vir null são listados em N.
 */
export type ApiResponse<K extends keyof Schemas, N extends keyof Schemas[K] = never> = {
  [P in keyof Schemas[K]]-?: P extends N ? Exclude<Schemas[K][P], undefined> | null : Exclude<Schemas[K][P], undefined>;
};
```

- [ ] **Step 7: Rodar e ver passar**

Run: `npm test -- --watch=false`
Expected: PASS. Se o `CreateAccountRequest['name']` vier `string | undefined` (o springdoc não marcou `@NotBlank` como obrigatório), trocar a última asserção por `toEqualTypeOf<string | undefined>()` e anotar no commit; os planos seguintes tratam requests como `ApiSchema`, então seguem funcionando.

- [ ] **Step 8: Verificar e commitar**

Run: `npm run lint && npm run build`

```bash
git add -A
git commit -m "feat(api): gera tipos do OpenAPI e helpers ApiSchema/ApiResponse

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Verificação final da fase 0a

**Files:** nenhum.

- [ ] **Step 1: Rodar tudo do zero**

Run: `npm ci && npm run lint && npm test -- --watch=false && npm run build`
Expected: tudo passa.

- [ ] **Step 2: Conferir o lock do PrimeNG**

Run: `npm ls primeng @primeuix/themes`
Expected: `primeng@21.1.x` e `@primeuix/themes@2.x`.

- [ ] **Step 3: Conferir o estado do git**

Run: `git status --short && git log --oneline`
Expected: working tree limpo; 6 commits novos sobre o commit de docs.
