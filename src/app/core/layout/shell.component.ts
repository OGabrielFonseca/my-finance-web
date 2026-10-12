import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { Button } from 'primeng/button';
import { Drawer } from 'primeng/drawer';

import { MENU } from './menu';
import { ThemeToggleComponent } from './theme-toggle.component';
import { UserMenuComponent } from './user-menu.component';

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
    UserMenuComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './shell.component.html',
})
export class ShellComponent {
  protected readonly menu = MENU;
  protected readonly menuOpen = signal(false);
}
