import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActiveCategoryLookupService, toCategoryOptions } from '@features/categories';
import { toLocalDate } from '@shared/data';
import { FieldComponent, FormFooterComponent, injectFormSubmit } from '@shared/forms';
import { DatePicker } from 'primeng/datepicker';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { InputNumber } from 'primeng/inputnumber';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';

import { CreditCardApiService } from '../data/credit-card-api.service';

/** Compra no cartão: a API cria as faturas necessárias e as parcelas. */
@Component({
  selector: 'app-purchase-form',
  imports: [ReactiveFormsModule, FieldComponent, FormFooterComponent, DatePicker, InputNumber, InputText, Select],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './purchase-form.component.html',
})
export class PurchaseFormComponent {
  private readonly api = inject(CreditCardApiService);
  private readonly categoryLookup = inject(ActiveCategoryLookupService);
  protected readonly ref = inject(DynamicDialogRef);
  private readonly cardId = (inject(DynamicDialogConfig).data as { cardId: string }).cardId;

  protected readonly categoryOptions = computed(() => toCategoryOptions(this.categoryLookup.items(), 'EXPENSE'));

  protected readonly form = inject(NonNullableFormBuilder).group({
    description: ['', [Validators.required, Validators.maxLength(200)]],
    amount: [null as number | null, [Validators.required, Validators.min(0.01)]],
    date: [new Date() as Date | null, Validators.required],
    categoryId: ['', Validators.required],
    installments: [1 as number | null, [Validators.required, Validators.min(1), Validators.max(72)]],
    notes: ['', Validators.maxLength(2000)],
  });

  protected readonly submit = injectFormSubmit(
    this.form,
    (value, context) =>
      this.api.purchase(
        this.cardId,
        {
          description: value.description.trim(),
          amount: value.amount ?? 0,
          date: toLocalDate(value.date ?? new Date()),
          categoryId: value.categoryId,
          installments: value.installments ?? 1,
          notes: value.notes.trim() || undefined,
        },
        context,
      ),
    () => this.ref.close(true),
  );

  constructor() {
    this.categoryLookup.ensureLoaded();
  }
}
