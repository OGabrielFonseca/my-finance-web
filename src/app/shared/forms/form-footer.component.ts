import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Button } from 'primeng/button';
import { Message } from 'primeng/message';

import type { FormSubmit } from './form-submit';

/**
 * Rodapé padrão dos formulários em diálogo: erro geral (409/422) + Cancelar/Salvar.
 * Fica DENTRO do <form [formGroup]> do componente (o botão Salvar é type="submit").
 */
@Component({
  selector: 'app-form-footer',
  imports: [Button, Message],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (submit().error(); as message) {
      <p-message severity="error">{{ message }}</p-message>
    }
    <div class="flex justify-end gap-2 pt-2">
      <p-button type="button" severity="secondary" [text]="true" [label]="'Cancelar'" (onClick)="cancelled.emit()" />
      <p-button type="submit" [label]="'Salvar'" [loading]="submit().submitting()" />
    </div>
  `,
})
export class FormFooterComponent {
  readonly submit = input.required<FormSubmit>();
  readonly cancelled = output();
}
