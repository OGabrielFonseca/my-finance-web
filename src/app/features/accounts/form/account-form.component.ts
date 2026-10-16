import { enumLabel } from '@shared/i18n/enum-labels';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { FieldComponent } from '@shared/forms';
import { FormFooterComponent } from '@shared/forms';
import { injectFormSubmit } from '@shared/forms';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { InputNumber } from 'primeng/inputnumber';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';

import { AccountApiService } from '../data/account-api.service';
import type { AccountType } from '../data/account.model';
import { ACCOUNT_TYPES } from '../data/account.model';

@Component({
  selector: 'app-account-form',
  imports: [ReactiveFormsModule, FieldComponent, FormFooterComponent, InputNumber, InputText, Select],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './account-form.component.html',
})
export class AccountFormComponent {
  private readonly api = inject(AccountApiService);
  protected readonly ref = inject(DynamicDialogRef);
  private readonly id = (inject(DynamicDialogConfig).data as { id?: string } | undefined)?.id;

  protected readonly typeOptions = ACCOUNT_TYPES.map((value) => ({
    value,
    label: enumLabel('accountType', value),
  }));

  protected readonly form = inject(NonNullableFormBuilder).group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    type: ['CHECKING' as AccountType, Validators.required],
    institution: ['', Validators.maxLength(100)],
    initialBalance: [0, Validators.required],
  });

  protected readonly submit = injectFormSubmit(
    this.form,
    (value, context) => {
      const body = { ...value, institution: value.institution.trim() || undefined };
      return this.id ? this.api.update(this.id, body, context) : this.api.create(body, context);
    },
    () => this.ref.close(true),
  );

  constructor() {
    if (this.id) {
      this.api
        .get(this.id)
        .subscribe((account) => this.form.patchValue({ ...account, institution: account.institution ?? '' }));
    }
  }
}
