import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { enumLabel } from '@shared/i18n/enum-labels';
import { FieldComponent, FormFooterComponent, injectFormSubmit } from '@shared/forms';
import { NotifierService } from '@shared/ui';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';

import { IntegrationApiService } from '../data/integration-api.service';
import type { BankAccountLink, CreateBankAccountRequest } from '../data/integration.model';

const BANK_ACCOUNT_TYPES: CreateBankAccountRequest['type'][] = ['CHECKING', 'SAVINGS'];

/** Cria uma conta do MyFinance a partir da conta do banco: o saldo inicial é o saldo atual do banco. */
@Component({
  selector: 'app-create-account-dialog',
  imports: [CurrencyPipe, ReactiveFormsModule, FieldComponent, FormFooterComponent, InputText, Select],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './create-account-dialog.component.html',
})
export class CreateAccountDialogComponent {
  private readonly api = inject(IntegrationApiService);
  private readonly notifier = inject(NotifierService);
  protected readonly ref = inject(DynamicDialogRef);
  protected readonly link = (inject(DynamicDialogConfig).data as { link: BankAccountLink }).link;

  protected readonly typeOptions = BANK_ACCOUNT_TYPES.map((value) => ({
    value,
    label: enumLabel('accountType', value),
  }));

  protected readonly form = inject(NonNullableFormBuilder).group({
    name: [this.link.externalName, [Validators.required, Validators.maxLength(100)]],
    type: ['CHECKING' as CreateBankAccountRequest['type'], Validators.required],
  });

  protected readonly submit = injectFormSubmit(
    this.form,
    (value, context) => this.api.createAccount(this.link.id, { name: value.name.trim(), type: value.type }, context),
    (created) => {
      const items = created.pendingItems;
      this.notifier.success(`Conta criada · ${items} ${items === 1 ? 'item' : 'itens'} na fila`);
      this.ref.close(true);
    },
  );
}
