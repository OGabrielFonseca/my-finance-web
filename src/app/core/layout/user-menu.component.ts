import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { environment } from '@env/environment';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { Notifier } from '@shared/ui/notifier';
import type { MenuItem } from 'primeng/api';
import { Button } from 'primeng/button';
import { Menu } from 'primeng/menu';

import { AuthStore } from '../auth/auth.store';

/** Botão com o nome do usuário e menu (Sair; no mock, também "Expirar sessão"). */
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
  private readonly http = inject(HttpClient);
  private readonly transloco = inject(TranslocoService);
  private readonly notifier = inject(Notifier);

  // As traduções globais já estão carregadas (provideI18n espera por elas na inicialização).
  protected readonly items: MenuItem[] = [
    { label: this.transloco.translate('user.logout'), icon: 'pi pi-sign-out', command: () => this.auth.logout() },
    ...(environment.useMockApi
      ? [
          {
            label: this.transloco.translate('user.expireSession'),
            icon: 'pi pi-clock',
            command: () => this.expireSession(),
          },
        ]
      : []),
  ];

  /** Só no protótipo: a API mock passa a responder 401 na próxima chamada. */
  private expireSession(): void {
    this.http
      .post(`${environment.apiUrl}/__mock/expire-session`, null)
      .subscribe(() => this.notifier.success('user.expireSessionDone'));
  }
}
