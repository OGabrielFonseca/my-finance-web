import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Button } from 'primeng/button';

/** Moldura das telas de cadastro: título, ações extras (atributo pageActions) e botão "Novo". */
@Component({
  selector: 'app-crud-page',
  imports: [TranslocoPipe, Button],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="flex flex-col gap-4">
      <header class="flex flex-wrap items-center gap-3">
        <h1 class="m-0 flex-1 text-2xl font-semibold">{{ title() | transloco }}</h1>
        <ng-content select="[pageActions]" />
        @if (showCreate()) {
          <p-button icon="pi pi-plus" [label]="'common.new' | transloco" (onClick)="create.emit()" />
        }
      </header>
      <ng-content />
    </section>
  `,
})
export class CrudPageComponent {
  readonly title = input.required<string>(); // chave i18n
  readonly showCreate = input(true);
  readonly create = output();
}
