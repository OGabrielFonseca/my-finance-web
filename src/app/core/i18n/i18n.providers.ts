import { registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';
import type { EnvironmentProviders, Provider } from '@angular/core';
import { DEFAULT_CURRENCY_CODE, LOCALE_ID, inject, provideAppInitializer } from '@angular/core';
import { PrimeNG } from 'primeng/config';
import { pt_BR } from 'primelocale/js/pt_BR.js';

import { APP_LOCALE } from './locale';

/** Idioma único do app: os textos ficam direto no código, em português. */
export function provideI18n(): (Provider | EnvironmentProviders)[] {
  registerLocaleData(localePt, APP_LOCALE);

  return [
    { provide: LOCALE_ID, useValue: APP_LOCALE },
    { provide: DEFAULT_CURRENCY_CODE, useValue: 'BRL' },
    // Textos globais dos componentes do PrimeNG (calendário, paginação etc.).
    provideAppInitializer(() => inject(PrimeNG).setTranslation(pt_BR)),
  ];
}
