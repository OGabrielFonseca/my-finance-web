import { enumLabel } from '@shared/i18n/enum-labels';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AccountLookupService, toAccountOptions } from '@features/accounts';
import { fromLocalDate, toLocalDate } from '@shared/data';
import { FieldComponent, FormFooterComponent, injectFormSubmit } from '@shared/forms';
import { DatePicker } from 'primeng/datepicker';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { InputNumber } from 'primeng/inputnumber';
import { Select } from 'primeng/select';

import { AssetLookupService } from '../data/asset-lookup.service';
import { OperationApiService } from '../data/operation-api.service';
import type { Operation, OperationType } from '../data/investment.model';
import { OPERATION_TYPES, isTradeType, toAssetOptions } from '../data/investment.model';

export interface OperationFormData {
  operation?: Operation;
}

@Component({
  selector: 'app-operation-form',
  imports: [ReactiveFormsModule, FieldComponent, FormFooterComponent, DatePicker, InputNumber, Select],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './operation-form.component.html',
})
export class OperationFormComponent {
  private readonly api = inject(OperationApiService);
  private readonly accounts = inject(AccountLookupService);
  private readonly assets = inject(AssetLookupService);
  protected readonly ref = inject(DynamicDialogRef);
  protected readonly data = inject(DynamicDialogConfig).data as OperationFormData;

  protected readonly accountOptions = computed(() => toAccountOptions(this.accounts.items()));
  protected readonly assetOptions = computed(() => toAssetOptions(this.assets.items()));
  protected readonly typeOptions = OPERATION_TYPES.map((value) => ({
    value,
    label: enumLabel('operationType', value),
  }));

  /** Compra e venda pedem preço e taxas; desdobramento e bonificação não. */
  protected readonly trade = signal(true);

  protected readonly form = inject(NonNullableFormBuilder).group({
    accountId: ['', Validators.required],
    assetId: ['', Validators.required],
    type: ['BUY' as OperationType, Validators.required],
    date: [new Date() as Date | null, Validators.required],
    quantity: [null as number | null, [Validators.required, Validators.min(0.00000001)]],
    unitPrice: [null as number | null, [Validators.required, Validators.min(0)]],
    fees: [0 as number | null, Validators.min(0)],
  });

  protected readonly submit = injectFormSubmit(
    this.form,
    (value, context) => {
      const trade = isTradeType(value.type);
      const body = {
        accountId: value.accountId,
        type: value.type,
        date: toLocalDate(value.date ?? new Date()),
        quantity: value.quantity ?? 0,
        unitPrice: trade ? (value.unitPrice ?? 0) : undefined,
        fees: trade ? (value.fees ?? 0) : undefined,
      };
      return this.data.operation
        ? this.api.update(this.data.operation.id, body, context)
        : this.api.create({ ...body, assetId: value.assetId }, context);
    },
    () => this.ref.close(true),
  );

  constructor() {
    this.accounts.ensureLoaded();
    this.assets.ensureLoaded();

    this.form.controls.type.valueChanges.subscribe((type) => this.applyType(type));
    this.applyType(this.form.controls.type.value);

    const operation = this.data.operation;
    if (operation) {
      this.form.controls.assetId.disable();
      this.form.patchValue({
        accountId: operation.account.id,
        assetId: operation.asset.id,
        type: operation.type,
        date: fromLocalDate(operation.operationDate),
        quantity: operation.quantity,
        unitPrice: operation.unitPrice,
        fees: operation.fees ?? 0,
      });
    }
  }

  private applyType(type: OperationType): void {
    const trade = isTradeType(type);
    this.trade.set(trade);
    const price = this.form.controls.unitPrice;
    price.setValidators(trade ? [Validators.required, Validators.min(0)] : []);
    price.updateValueAndValidity();
  }
}
