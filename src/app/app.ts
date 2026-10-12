import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { Toast } from 'primeng/toast';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ConfirmDialog, Toast],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <router-outlet />
    <p-toast position="top-right" />
    <p-confirmdialog />
  `,
})
export class App {}
