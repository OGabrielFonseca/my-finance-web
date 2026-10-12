import type { EnvironmentProviders } from '@angular/core';
import { inject, provideAppInitializer } from '@angular/core';

import { AuthStoreService } from './auth-store.service';

/** Restaura a sessão salva antes da primeira navegação (os guards dependem dela). */
export function provideAuth(): EnvironmentProviders {
  return provideAppInitializer(() => inject(AuthStoreService).restoreSession());
}
