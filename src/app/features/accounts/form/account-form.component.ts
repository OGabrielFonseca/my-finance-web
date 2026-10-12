import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslocoService } from '@jsverse/transloco';
import { FieldComponent } from '@shared/forms/field.component';
import { FormFooterComponent } from '@shared/forms/form-footer.component';
import { injectFormSubmit } from '@shared/forms/form-submit';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { InputNumber } from 'primeng/inputnumber';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';

import { AccountApi } from '../data/account.api';
import type { AccountType } from '../data/account.model';
import { ACCOUNT_TYPES } from '../data/account.model';

@Component({
  selector: 'app-account-form',
  imports: [ReactiveFormsModule, FieldComponent, FormFooterComponent, InputNumber, InputText, Select],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './account-form.component.html',
})
export class AccountFormComponent {
  private readonly api = inject(AccountApi);
  private readonly transloco = inject(TranslocoService);
  protected readonly ref = inject(DynamicDialogRef);
  private readonly id = (inject(DynamicDialogConfig).data as { id?: string } | undefined)?.id;

  protected readonly typeOptions = ACCOUNT_TYPES.map((value) => ({
    value,
    label: this.transloco.translate(`enums.accountType.${value}`),
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
