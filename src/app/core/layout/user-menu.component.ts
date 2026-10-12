import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import type { MenuItem } from 'primeng/api';
import { Button } from 'primeng/button';
import { Menu } from 'primeng/menu';

import { AuthStore } from '../auth/auth.store';

/** Botão com o nome do usuário e menu (Sair). */
@Component({
  selector: 'app-user-menu',
  imports: [TranslocoPipe, Button, Menu],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p-button
      icon="pi pi-user"
      severity="secondary"
      [text]="true"
      [label]="auth.user()?.name ?? ''"
      [ariaLabel]="'user.menu' | transloco"
      (onClick)="menu.toggle($event)"
    />
    <p-menu #menu [model]="items" [popup]="true" appendTo="body" />
  `,
})
export class UserMenuComponent {
  protected readonly auth = inject(AuthStore);
  private readonly transloco = inject(TranslocoService);

  // As traduções globais já estão carregadas (provideI18n espera por elas na inicialização).
  protected readonly items: MenuItem[] = [
    { label: this.transloco.translate('user.logout'), icon: 'pi pi-sign-out', command: () => this.auth.logout() },
  ];
}
