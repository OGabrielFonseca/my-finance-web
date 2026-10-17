import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ImportCountStore } from '@features/imports';
import { Badge } from 'primeng/badge';
import { Button } from 'primeng/button';
import { Drawer } from 'primeng/drawer';
import { filter } from 'rxjs';

import { buildMenu } from './menu';
import { ThemeToggleComponent } from './theme-toggle.component';
import { UserMenuComponent } from './user-menu.component';

/** Rotas cuja entrada ou saída pode mudar a fila (e, por isso, o contador do menu). */
const COUNT_ROUTES = ['/imports', '/integrations'];

@Component({
  selector: 'app-shell',
  imports: [
    NgTemplateOutlet,
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    Badge,
    Button,
    Drawer,
    ThemeToggleComponent,
    UserMenuComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './shell.component.html',
})
export class ShellComponent {
  private readonly importCount = inject(ImportCountStore);
  protected readonly menu = buildMenu(this.importCount.pending);
  protected readonly menuOpen = signal(false);

  constructor() {
    this.importCount.refresh();
    inject(Router)
      .events.pipe(
        filter((event) => event instanceof NavigationEnd),
        filter((event) => COUNT_ROUTES.some((route) => event.urlAfterRedirects.startsWith(route))),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.importCount.refresh());
  }
}
