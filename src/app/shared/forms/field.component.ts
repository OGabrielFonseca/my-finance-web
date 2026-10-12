import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import type { AbstractControl } from '@angular/forms';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { Message } from 'primeng/message';
import { startWith, switchMap } from 'rxjs';

import { validationMessage } from './validation-message';

/** Rótulo + controle projetado + mensagem de erro (do Angular, traduzida, ou do servidor). */
@Component({
  selector: 'app-field',
  imports: [TranslocoPipe, Message],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col gap-1">
      <label [for]="fieldId()" class="text-sm font-medium">{{ label() | transloco }}</label>
      <ng-content />
      @if (message(); as text) {
        <p-message severity="error" size="small" variant="simple">{{ text }}</p-message>
      }
    </div>
  `,
})
export class FieldComponent {
  readonly label = input.required<string>(); // chave i18n
  readonly fieldId = input.required<string>(); // id do input (inputId nos componentes do PrimeNG)
  readonly control = input.required<AbstractControl>();

  private readonly transloco = inject(TranslocoService);
  // Os erros de um AbstractControl não são signals: os eventos do controle disparam o recálculo.
  private readonly controlEvents = toSignal(
    toObservable(this.control).pipe(switchMap((control) => control.events.pipe(startWith(null)))),
  );

  readonly message = computed(() => {
    this.controlEvents();
    const control = this.control();
    if (!control.touched || !control.errors) return null;
    return validationMessage(control.errors, (key, params) => this.transloco.translate(key, params));
  });
}
