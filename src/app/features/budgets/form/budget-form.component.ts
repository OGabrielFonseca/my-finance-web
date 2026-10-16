import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActiveCategoryLookupService, toCategoryOptions } from '@features/categories';
import { toLocalDate } from '@shared/data';
import { FieldComponent, FormFooterComponent, injectFormSubmit } from '@shared/forms';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { InputNumber } from 'primeng/inputnumber';
import { Select } from 'primeng/select';

import { BudgetApiService } from '../data/budget-api.service';
import type { Budget } from '../data/budget.model';

/** Criação: categoria de despesa e mês. Edição: só o valor (categoria e mês não mudam). */
export interface BudgetFormData {
  budget?: Budget;
  month: Date;
}

@Component({
  selector: 'app-budget-form',
  imports: [ReactiveFormsModule, FieldComponent, FormFooterComponent, InputNumber, Select],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './budget-form.component.html',
})
export class BudgetFormComponent {
  private readonly api = inject(BudgetApiService);
  private readonly categoryLookup = inject(ActiveCategoryLookupService);
  protected readonly ref = inject(DynamicDialogRef);
  protected readonly data = inject(DynamicDialogConfig).data as BudgetFormData;

  protected readonly categoryOptions = computed(() => toCategoryOptions(this.categoryLookup.items(), 'EXPENSE'));

  protected readonly form = inject(NonNullableFormBuilder).group({
    categoryId: ['', Validators.required],
    amount: [null as number | null, [Validators.required, Validators.min(0.01)]],
  });

  protected readonly submit = injectFormSubmit(
    this.form,
    (value, context) => {
      const amount = value.amount ?? 0;
      return this.data.budget
        ? this.api.update(this.data.budget.id, { amount }, context)
        : this.api.create({ categoryId: value.categoryId, month: toLocalDate(this.data.month), amount }, context);
    },
    () => this.ref.close(true),
  );

  constructor() {
    this.categoryLookup.ensureLoaded();
    if (this.data.budget) {
      this.form.controls.categoryId.disable();
      this.form.patchValue({ categoryId: this.data.budget.category.id, amount: this.data.budget.amount });
    }
  }
}
