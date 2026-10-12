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
