import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { fromLocalDate, toLocalDate } from '@shared/data';
import { FieldComponent, FormFooterComponent, injectFormSubmit } from '@shared/forms';
import { DatePicker } from 'primeng/datepicker';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { Checkbox } from 'primeng/checkbox';
import { InputNumber } from 'primeng/inputnumber';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';

import { AssetApiService } from '../data/asset-api.service';
import type { AssetClass, FixedIncomeRequest, Indexer } from '../data/investment.model';
import { ASSET_CLASSES, INDEXERS, isFixedIncomeClass } from '../data/investment.model';

@Component({
  selector: 'app-asset-form',
  imports: [
    ReactiveFormsModule,
    TranslocoPipe,
    FieldComponent,
    FormFooterComponent,
    Checkbox,
    DatePicker,
    InputNumber,
    InputText,
    Select,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './asset-form.component.html',
})
export class AssetFormComponent {
  private readonly api = inject(AssetApiService);
  private readonly transloco = inject(TranslocoService);
  protected readonly ref = inject(DynamicDialogRef);
  private readonly id = (inject(DynamicDialogConfig).data as { id?: string } | undefined)?.id;

  protected readonly classOptions = ASSET_CLASSES.map((value) => ({
    value,
    label: this.transloco.translate(`enums.assetClass.${value}`),
  }));
  protected readonly indexerOptions = INDEXERS.map((value) => ({
    value,
    label: this.transloco.translate(`enums.indexer.${value}`),
  }));

  /** Renda fixa e Tesouro mostram os detalhes e exigem indexador e taxa. */
  protected readonly fixedIncome = signal(false);

  protected readonly form = inject(NonNullableFormBuilder).group({
    ticker: ['', [Validators.required, Validators.maxLength(30)]],
    name: ['', [Validators.required, Validators.maxLength(150)]],
    assetClass: ['STOCK' as AssetClass, Validators.required],
    issuer: ['', Validators.maxLength(100)],
    indexer: ['CDI' as Indexer, Validators.required],
    rate: [null as number | null],
    maturityDate: [null as Date | null],
    taxExempt: [false],
  });

  protected readonly submit = injectFormSubmit(
    this.form,
    (value, context) => {
      const body = {
        ticker: value.ticker.trim(),
        name: value.name.trim(),
        fixedIncome: this.fixedIncomeBody(),
      };
      return this.id
        ? this.api.update(this.id, body, context)
        : this.api.create({ ...body, assetClass: value.assetClass }, context);
    },
    () => this.ref.close(true),
  );

  constructor() {
    this.form.controls.assetClass.valueChanges.subscribe((assetClass) => this.applyClass(assetClass));
    this.applyClass(this.form.controls.assetClass.value);

    if (this.id) {
      this.form.controls.assetClass.disable();
      this.api.get(this.id).subscribe((asset) => {
        const fi = asset.fixedIncome;
        this.form.patchValue({
          ticker: asset.ticker,
          name: asset.name,
          assetClass: asset.assetClass,
          issuer: fi?.issuer ?? '',
          indexer: fi?.indexer ?? 'CDI',
          rate: fi?.rate ?? null,
          maturityDate: fi?.maturityDate ? fromLocalDate(fi.maturityDate) : null,
          taxExempt: fi?.taxExempt ?? false,
        });
      });
    }
  }

  /** Detalhes de renda fixa só existem para as classes FIXED_INCOME e TREASURY. */
  private fixedIncomeBody(): FixedIncomeRequest | undefined {
    if (!this.fixedIncome()) return undefined;
    const value = this.form.getRawValue();
    return {
      issuer: value.issuer.trim() || undefined,
      indexer: value.indexer,
      rate: value.rate ?? 0,
      maturityDate: value.maturityDate ? toLocalDate(value.maturityDate) : undefined,
      taxExempt: value.taxExempt,
    };
  }

  private applyClass(assetClass: AssetClass): void {
    this.fixedIncome.set(isFixedIncomeClass(assetClass));
    const rate = this.form.controls.rate;
    rate.setValidators(this.fixedIncome() ? [Validators.required, Validators.min(0)] : []);
    rate.updateValueAndValidity();
  }
}
