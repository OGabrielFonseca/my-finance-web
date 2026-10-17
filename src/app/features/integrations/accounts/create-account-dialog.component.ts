import { CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { enumLabel } from '@shared/i18n/enum-labels';
import { FieldComponent, FormFooterComponent, injectFormSubmit } from '@shared/forms';
import { toLocalDate } from '@shared/data';
import { NotifierService } from '@shared/ui';
import { DatePicker } from 'primeng/datepicker';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { InputText } from 'primeng/inputtext';
import { InputNumber } from 'primeng/inputnumber';
import { Select } from 'primeng/select';

import { IntegrationApiService } from '../data/integration-api.service';
import { importFromRange } from '../data/import-from';
import type { BankAccountLink, CreateBankAccountRequest } from '../data/integration.model';

const BANK_ACCOUNT_TYPES: CreateBankAccountRequest['type'][] = ['CHECKING', 'SAVINGS'];

/** Cria uma conta do MyFinance a partir da conta do banco. O saldo inicial vem preenchido com o saldo do banco. */
@Component({
  selector: 'app-create-account-dialog',
  imports: [
    CurrencyPipe,
    DatePipe,
    ReactiveFormsModule,
    FieldComponent,
    FormFooterComponent,
    DatePicker,
    InputText,
    InputNumber,
    Select,
  ],
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

  protected readonly range = importFromRange(new Date());

  protected readonly form = inject(NonNullableFormBuilder).group({
    name: [this.link.externalName, [Validators.required, Validators.maxLength(100)]],
    type: ['CHECKING' as CreateBankAccountRequest['type'], Validators.required],
    initialBalance: [this.link.bankBalance ?? 0, Validators.required],
    importFrom: [new Date(), Validators.required],
  });

  protected readonly submit = injectFormSubmit(
    this.form,
    (value, context) =>
      this.api.createAccount(
        this.link.id,
        {
          name: value.name.trim(),
          type: value.type,
          initialBalance: value.initialBalance,
          importFrom: toLocalDate(value.importFrom),
        },
        context,
      ),
    (created) => {
      const items = created.pendingItems;
      this.notifier.success(`Conta criada · ${items} ${items === 1 ? 'item' : 'itens'} na fila`);
      this.ref.close(true);
    },
  );
}
