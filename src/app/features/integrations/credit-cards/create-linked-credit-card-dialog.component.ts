import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AccountLookupService, toAccountOptions } from '@features/accounts';
import { toLocalDate } from '@shared/data';
import { FieldComponent, FormFooterComponent, injectFormSubmit } from '@shared/forms';
import { NotifierService } from '@shared/ui';
import { DatePicker } from 'primeng/datepicker';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { InputNumber } from 'primeng/inputnumber';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';

import { IntegrationApiService } from '../data/integration-api.service';
import { importFromRange } from '../data/import-from';
import type { CreditCardLink } from '../data/integration.model';

/** Cria um cartão do MyFinance a partir da conta de cartão da Pluggy. Os dias aparecem só quando faltam na conta. */
@Component({
  selector: 'app-create-linked-credit-card-dialog',
  imports: [ReactiveFormsModule, FieldComponent, FormFooterComponent, DatePicker, InputNumber, InputText, Select],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './create-linked-credit-card-dialog.component.html',
})
export class CreateLinkedCreditCardDialogComponent {
  private readonly api = inject(IntegrationApiService);
  private readonly notifier = inject(NotifierService);
  private readonly lookup = inject(AccountLookupService);
  protected readonly ref = inject(DynamicDialogRef);
  protected readonly link = (inject(DynamicDialogConfig).data as { link: CreditCardLink }).link;

  protected readonly accountOptions = computed(() => toAccountOptions(this.lookup.items()));
  protected readonly range = importFromRange(new Date());
  protected readonly askClosingDay = this.link.closingDay == null;
  protected readonly askDueDay = this.link.dueDay == null;

  protected readonly form = inject(NonNullableFormBuilder).group({
    name: ['', [Validators.maxLength(100)]],
    closingDay: [null as number | null, this.askClosingDay ? [Validators.required] : []],
    dueDay: [null as number | null, this.askDueDay ? [Validators.required] : []],
    paymentAccountId: ['', Validators.required],
    importFrom: [new Date(), Validators.required],
  });

  protected readonly submit = injectFormSubmit(
    this.form,
    (value, context) =>
      this.api.createLinkedCreditCard(
        this.link.id,
        {
          name: value.name.trim() || undefined,
          closingDay: this.askClosingDay ? (value.closingDay ?? undefined) : undefined,
          dueDay: this.askDueDay ? (value.dueDay ?? undefined) : undefined,
          paymentAccountId: value.paymentAccountId,
          importFrom: toLocalDate(value.importFrom),
        },
        context,
      ),
    (created) => {
      this.notifier.success(created.creditCard ? `Cartão criado · ${created.creditCard.name}` : 'Cartão criado');
      this.ref.close(true);
    },
  );

  constructor() {
    this.lookup.ensureLoaded();
  }
}
