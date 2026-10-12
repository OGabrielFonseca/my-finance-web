import { inject } from '@angular/core';
import type { CanActivateFn } from '@angular/router';
import { Router } from '@angular/router';

import { AuthStoreService } from './auth-store.service';

/** Rotas internas: sem sessão vai para o login, guardando a URL pedida. */
export const authGuard: CanActivateFn = (_route, state) =>
  inject(AuthStoreService).isAuthenticated() ||
  inject(Router).createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });

/** Login/cadastro: quem já está logado vai para o dashboard. */
export const guestGuard: CanActivateFn = () =>
  !inject(AuthStoreService).isAuthenticated() || inject(Router).createUrlTree(['/dashboard']);
