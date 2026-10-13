import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AccountLookupService, toAccountOptions } from '@features/accounts';
import { FieldComponent, FormFooterComponent, injectFormSubmit } from '@shared/forms';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { InputNumber } from 'primeng/inputnumber';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';

import { CreditCardApiService } from '../data/credit-card-api.service';

@Component({
  selector: 'app-credit-card-form',
  imports: [ReactiveFormsModule, FieldComponent, FormFooterComponent, InputNumber, InputText, Select],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './credit-card-form.component.html',
})
export class CreditCardFormComponent {
  private readonly api = inject(CreditCardApiService);
  private readonly accountLookup = inject(AccountLookupService);
  protected readonly ref = inject(DynamicDialogRef);
  private readonly id = (inject(DynamicDialogConfig).data as { id?: string } | undefined)?.id;

  protected readonly accountOptions = computed(() => toAccountOptions(this.accountLookup.items()));

  protected readonly form = inject(NonNullableFormBuilder).group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    brand: ['', Validators.maxLength(30)],
    creditLimit: [0, [Validators.required, Validators.min(0)]],
    closingDay: [1, [Validators.required, Validators.min(1), Validators.max(31)]],
    dueDay: [10, [Validators.required, Validators.min(1), Validators.max(31)]],
    paymentAccountId: ['', Validators.required],
  });

  protected readonly submit = injectFormSubmit(
    this.form,
    (value, context) => {
      const body = { ...value, name: value.name.trim(), brand: value.brand.trim() || undefined };
      return this.id ? this.api.update(this.id, body, context) : this.api.create(body, context);
    },
    () => this.ref.close(true),
  );

  constructor() {
    this.accountLookup.ensureLoaded();
    if (this.id) {
      this.api
        .get(this.id)
        .subscribe((card) =>
          this.form.patchValue({ ...card, brand: card.brand ?? '', paymentAccountId: card.paymentAccount.id }),
        );
    }
  }
}
