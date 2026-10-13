import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AccountLookupService, toAccountOptions } from '@features/accounts';
import { TranslocoService } from '@jsverse/transloco';
import { fromLocalDate, toLocalDate } from '@shared/data';
import { FieldComponent, FormFooterComponent, injectFormSubmit } from '@shared/forms';
import { DatePicker } from 'primeng/datepicker';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { InputNumber } from 'primeng/inputnumber';
import { Select } from 'primeng/select';

import { AssetLookupService } from '../data/asset-lookup.service';
import { IncomeApiService } from '../data/income-api.service';
import type { Income, IncomeType } from '../data/investment.model';
import { INCOME_TYPES, toAssetOptions } from '../data/investment.model';

export interface IncomeFormData {
  income?: Income;
}

@Component({
  selector: 'app-income-form',
  imports: [ReactiveFormsModule, FieldComponent, FormFooterComponent, DatePicker, InputNumber, Select],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './income-form.component.html',
})
export class IncomeFormComponent {
  private readonly api = inject(IncomeApiService);
  private readonly accounts = inject(AccountLookupService);
  private readonly assets = inject(AssetLookupService);
  private readonly transloco = inject(TranslocoService);
  protected readonly ref = inject(DynamicDialogRef);
  protected readonly data = inject(DynamicDialogConfig).data as IncomeFormData;

  protected readonly accountOptions = computed(() => toAccountOptions(this.accounts.items()));
  protected readonly assetOptions = computed(() => toAssetOptions(this.assets.items()));
  protected readonly typeOptions = INCOME_TYPES.map((value) => ({
    value,
    label: this.transloco.translate(`enums.incomeType.${value}`),
  }));

  protected readonly form = inject(NonNullableFormBuilder).group({
    accountId: ['', Validators.required],
    assetId: ['', Validators.required],
    type: ['DIVIDEND' as IncomeType, Validators.required],
    paymentDate: [new Date() as Date | null, Validators.required],
    grossAmount: [null as number | null, [Validators.required, Validators.min(0.01)]],
    taxAmount: [0 as number | null, Validators.min(0)],
  });

  protected readonly submit = injectFormSubmit(
    this.form,
    (value, context) => {
      const body = {
        accountId: value.accountId,
        type: value.type,
        paymentDate: toLocalDate(value.paymentDate ?? new Date()),
        grossAmount: value.grossAmount ?? 0,
        taxAmount: value.taxAmount ?? 0,
      };
      return this.data.income
        ? this.api.update(this.data.income.id, body, context)
        : this.api.create({ ...body, assetId: value.assetId }, context);
    },
    () => this.ref.close(true),
  );

  constructor() {
    this.accounts.ensureLoaded();
    this.assets.ensureLoaded();

    const income = this.data.income;
    if (income) {
      this.form.controls.assetId.disable();
      this.form.patchValue({
        accountId: income.account.id,
        assetId: income.asset.id,
        type: income.type,
        paymentDate: fromLocalDate(income.paymentDate),
        grossAmount: income.grossAmount,
        taxAmount: income.taxAmount,
      });
    }
  }
}
