import { ChangeDetectionStrategy, Component, effect, inject, input, output } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { FieldComponent, injectFormSubmit } from '@shared/forms';
import { NotifierService } from '@shared/ui';
import { ConfirmationService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { InputText } from 'primeng/inputtext';
import { Message } from 'primeng/message';
import { Password } from 'primeng/password';
import { Tag } from 'primeng/tag';

import { IntegrationApiService } from '../data/integration-api.service';
import type { Integration } from '../data/integration.model';

const FIELD_LABELS: Partial<Record<string, string>> = { CLIENT_ID: 'Client ID', CLIENT_SECRET: 'Client Secret' };

/** Bloco "Credenciais": formulário montado a partir de `fields` da API, salvar e remover a integração. */
@Component({
  selector: 'app-integration-credentials',
  imports: [ReactiveFormsModule, Button, Card, FieldComponent, InputText, Message, Password, Tag],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './integration-credentials.component.html',
})
export class IntegrationCredentialsComponent {
  readonly integration = input.required<Integration>();
  /** Emitido depois de salvar ou remover: a página recarrega integração e histórico. */
  readonly changed = output();

  private readonly api = inject(IntegrationApiService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly notifier = inject(NotifierService);

  protected fieldLabel(name: string): string {
    return FIELD_LABELS[name] ?? name;
  }

  // O grupo é estável; os controles são trocados quando a API devolve os campos (ver o effect).
  protected readonly form = new FormGroup<Record<string, FormControl<string>>>({});

  protected readonly submit = injectFormSubmit(
    this.form,
    (value, context) => this.api.save({ data: value }, context),
    () => {
      this.notifier.success('Credenciais salvas');
      this.changed.emit();
    },
  );

  constructor() {
    // Cria os controles na primeira vez e depois só os reseta: as diretivas do template seguram a referência do controle.
    effect(() => {
      for (const field of this.integration().fields) {
        // Secreto nunca volta preenchido: o usuário digita de novo (o PUT exige os obrigatórios).
        const value = field.secret ? '' : (field.value ?? '');
        const validators = field.required ? [Validators.required] : [];
        const existing = this.form.get(field.name);
        if (existing) {
          existing.setValidators(validators);
          existing.reset(value);
        } else {
          this.form.addControl(field.name, new FormControl(value, { nonNullable: true, validators }));
        }
      }
    });
  }

  protected remove(): void {
    this.confirmation.confirm({
      header: 'Remover integração',
      message:
        'Os bancos conectados e o histórico serão apagados do MyFinance. Para revogar o acesso, use o Meu Pluggy.',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Excluir',
      rejectLabel: 'Cancelar',
      acceptButtonProps: { severity: 'danger' },
      rejectButtonProps: { severity: 'secondary', text: true },
      accept: () =>
        this.api.remove().subscribe(() => {
          this.notifier.success('Integração removida');
          this.changed.emit();
        }),
    });
  }
}
