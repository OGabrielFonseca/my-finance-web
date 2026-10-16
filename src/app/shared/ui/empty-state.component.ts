import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Mensagem de lista vazia. Ações (link, botão) podem ser projetadas como conteúdo. */
@Component({
  selector: 'app-empty-state',
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col items-center gap-3 py-10 text-center text-muted-color">
      <i [class]="icon()" class="text-4xl"></i>
      <p class="m-0">{{ message() }}</p>
      <ng-content />
    </div>
  `,
})
export class EmptyStateComponent {
  readonly message = input('Nenhum registro encontrado.'); // chave i18n
  readonly icon = input('pi pi-inbox');
}
