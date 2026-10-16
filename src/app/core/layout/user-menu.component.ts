import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import type { MenuItem } from 'primeng/api';
import { Button } from 'primeng/button';
import { Menu } from 'primeng/menu';

import { AuthStoreService } from '../auth/auth-store.service';

/** Botão com o nome do usuário e menu (Sair). */
@Component({
  selector: 'app-user-menu',
  imports: [Button, Menu],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p-button
      icon="pi pi-user"
      severity="secondary"
      [text]="true"
      [label]="auth.user()?.name ?? ''"
      [ariaLabel]="'Menu do usuário'"
      (onClick)="menu.toggle($event)"
    />
    <p-menu #menu [model]="items" [popup]="true" appendTo="body" />
  `,
})
export class UserMenuComponent {
  protected readonly auth = inject(AuthStoreService);
  private readonly router = inject(Router);

  protected readonly items: MenuItem[] = [
    {
      label: 'Perfil',
      icon: 'pi pi-user',
      command: () => void this.router.navigateByUrl('/profile'),
    },
    { label: 'Sair', icon: 'pi pi-sign-out', command: () => this.auth.logout() },
  ];
}
