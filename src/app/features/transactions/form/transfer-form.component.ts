import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AccountLookupService, toAccountOptions } from '@features/accounts';
import { TranslocoService } from '@jsverse/transloco';
import { fromLocalDate, toLocalDate } from '@shared/data';
import { FieldComponent } from '@shared/forms';
import { FormFooterComponent } from '@shared/forms';
import { injectFormSubmit } from '@shared/forms';
import { DatePicker } from 'primeng/datepicker';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { InputNumber } from 'primeng/inputnumber';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { Textarea } from 'primeng/textarea';

import { TransactionApiService } from '../data/transaction-api.service';
import type { Transaction, TransactionStatus } from '../data/transaction.model';
import { TRANSACTION_STATUSES, statusForDate } from '../data/transaction.model';

/**
 * Transferência entre contas. Criação: POST /transactions/transfers. Edição: PUT /transactions/{id} com
 * accountId (origem) e destinationAccountId. Conta de origem igual à de destino é recusada pela API (422).
 */
@Component({
  selector: 'app-transfer-form',
  imports: [
    ReactiveFormsModule,
    FieldComponent,
    FormFooterComponent,
    DatePicker,
    InputNumber,
    InputText,
    Select,
    Textarea,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './transfer-form.component.html',
})
export class TransferFormComponent {
  private readonly api = inject(TransactionApiService);
  private readonly transloco = inject(TranslocoService);
  private readonly accountLookup = inject(AccountLookupService);
  protected readonly ref = inject(DynamicDialogRef);
  private readonly transaction = (inject(DynamicDialogConfig).data as { transaction?: Transaction } | undefined)
    ?.transaction;

  protected readonly accountOptions = computed(() => toAccountOptions(this.accountLookup.items()));
  protected readonly statusOptions = TRANSACTION_STATUSES.map((value) => ({
    value,
    label: this.transloco.translate(`enums.transactionStatus.${value}`),
  }));

  private readonly fb = inject(NonNullableFormBuilder);
  protected readonly form = this.fb.group({
    fromAccountId: ['', Validators.required],
    toAccountId: ['', Validators.required],
    description: ['', [Validators.required, Validators.maxLength(200)]],
    amount: this.fb.control<number | null>(null, [Validators.required, Validators.min(0.01)]),
    date: this.fb.control<Date | null>(new Date(), Validators.required),
    status: [statusForDate(new Date()) as TransactionStatus, Validators.required],
    notes: ['', Validators.maxLength(2000)],
  });

  protected readonly submit = injectFormSubmit(
    this.form,
    (value, context) => {
      const common = {
        description: value.description.trim(),
        amount: value.amount ?? 0,
        date: toLocalDate(value.date ?? new Date()),
        status: value.status,
        notes: value.notes.trim() || undefined,
      };
      return this.transaction
        ? this.api.update(
            this.transaction.id,
            { ...common, accountId: value.fromAccountId, destinationAccountId: value.toAccountId },
            context,
          )
        : this.api.createTransfer(
            { ...common, fromAccountId: value.fromAccountId, toAccountId: value.toAccountId },
            context,
          );
    },
    () => this.ref.close(true),
  );

  constructor() {
    this.accountLookup.ensureLoaded();

    if (this.transaction) {
      const t = this.transaction;
      this.form.patchValue({
        fromAccountId: t.account.id,
        toAccountId: t.destinationAccount?.id ?? '',
        description: t.description,
        amount: t.amount,
        date: fromLocalDate(t.date),
        status: t.status,
        notes: t.notes ?? '',
      });
    }

    this.form.controls.date.valueChanges.pipe(takeUntilDestroyed()).subscribe((date) => {
      if (date && !this.form.controls.status.dirty) this.form.controls.status.setValue(statusForDate(date));
    });
  }
}
