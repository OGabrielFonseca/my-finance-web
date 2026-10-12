import type { EnvironmentProviders } from '@angular/core';
import { inject, provideAppInitializer } from '@angular/core';

import { AuthStore } from './auth.store';

/** Restaura a sessão salva antes da primeira navegação (os guards dependem dela). */
export function provideAuth(): EnvironmentProviders {
  return provideAppInitializer(() => inject(AuthStore).restoreSession());
}
