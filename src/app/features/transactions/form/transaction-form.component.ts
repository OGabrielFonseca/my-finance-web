import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AccountLookupService, toAccountOptions } from '@features/accounts';
import { ActiveCategoryLookupService, toCategoryOptions } from '@features/categories';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { fromLocalDate, toLocalDate } from '@shared/data';
import { FieldComponent } from '@shared/forms';
import { FormFooterComponent } from '@shared/forms';
import { injectFormSubmit } from '@shared/forms';
import { DatePicker } from 'primeng/datepicker';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { InputNumber } from 'primeng/inputnumber';
import { InputText } from 'primeng/inputtext';
import { Message } from 'primeng/message';
import { Select } from 'primeng/select';
import { Textarea } from 'primeng/textarea';

import { TransactionApiService } from '../data/transaction-api.service';
import type { Transaction, TransactionStatus } from '../data/transaction.model';
import { TRANSACTION_STATUSES, statusForDate } from '../data/transaction.model';

/** Receita ou despesa. Na edição, o tipo não muda (o PUT não tem type). */
export interface TransactionFormData {
  type: 'INCOME' | 'EXPENSE';
  transaction?: Transaction;
}

@Component({
  selector: 'app-transaction-form',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    TranslocoPipe,
    FieldComponent,
    FormFooterComponent,
    DatePicker,
    InputNumber,
    InputText,
    Message,
    Select,
    Textarea,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './transaction-form.component.html',
})
export class TransactionFormComponent {
  private readonly api = inject(TransactionApiService);
  private readonly transloco = inject(TranslocoService);
  private readonly accountLookup = inject(AccountLookupService);
  private readonly categoryLookup = inject(ActiveCategoryLookupService);
  protected readonly ref = inject(DynamicDialogRef);
  protected readonly data = inject(DynamicDialogConfig).data as TransactionFormData;
  private readonly transaction = this.data.transaction;

  protected readonly accountOptions = computed(() => toAccountOptions(this.accountLookup.items()));
  protected readonly categoryOptions = computed(() => toCategoryOptions(this.categoryLookup.items(), this.data.type));
  protected readonly noCategories = computed(() => this.categoryLookup.loaded() && !this.categoryOptions().length);
  protected readonly statusOptions = TRANSACTION_STATUSES.map((value) => ({
    value,
    label: this.transloco.translate(`enums.transactionStatus.${value}`),
  }));

  private readonly fb = inject(NonNullableFormBuilder);
  protected readonly form = this.fb.group({
    description: ['', [Validators.required, Validators.maxLength(200)]],
    amount: this.fb.control<number | null>(null, [Validators.required, Validators.min(0.01)]),
    date: this.fb.control<Date | null>(new Date(), Validators.required),
    status: [statusForDate(new Date()) as TransactionStatus, Validators.required],
    accountId: ['', Validators.required],
    categoryId: ['', Validators.required],
    notes: ['', Validators.maxLength(2000)],
  });

  protected readonly submit = injectFormSubmit(
    this.form,
    (value, context) => {
      const body = {
        description: value.description.trim(),
        amount: value.amount ?? 0,
        date: toLocalDate(value.date ?? new Date()),
        status: value.status,
        accountId: value.accountId,
        categoryId: value.categoryId,
        notes: value.notes.trim() || undefined,
      };
      return this.transaction
        ? this.api.update(this.transaction.id, body, context)
        : this.api.create({ ...body, type: this.data.type }, context);
    },
    () => this.ref.close(true),
  );

  constructor() {
    this.accountLookup.ensureLoaded();
    this.categoryLookup.ensureLoaded();

    if (this.transaction) {
      const t = this.transaction;
      this.form.patchValue({
        description: t.description,
        amount: t.amount,
        date: fromLocalDate(t.date),
        status: t.status,
        accountId: t.account.id,
        categoryId: t.category?.id ?? '',
        notes: t.notes ?? '',
      });
    }

    // Enquanto o usuário não escolher a situação, ela acompanha a data (futuro = pendente).
    this.form.controls.date.valueChanges.pipe(takeUntilDestroyed()).subscribe((date) => {
      if (date && !this.form.controls.status.dirty) this.form.controls.status.setValue(statusForDate(date));
    });
  }
}
