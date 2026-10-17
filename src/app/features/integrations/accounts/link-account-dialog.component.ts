import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AccountLookupService, toAccountOptions } from '@features/accounts';
import { FieldComponent, FormFooterComponent, injectFormSubmit } from '@shared/forms';
import { toLocalDate } from '@shared/data';
import { NotifierService } from '@shared/ui';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { DatePicker } from 'primeng/datepicker';
import { Select } from 'primeng/select';

import { IntegrationApiService } from '../data/integration-api.service';
import type { BankAccountLink } from '../data/integration.model';

/** Vincula uma conta encontrada no banco a uma conta do MyFinance, a partir de uma data de corte. */
@Component({
  selector: 'app-link-account-dialog',
  imports: [ReactiveFormsModule, FieldComponent, FormFooterComponent, DatePicker, Select],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './link-account-dialog.component.html',
})
export class LinkAccountDialogComponent {
  private readonly api = inject(IntegrationApiService);
  private readonly notifier = inject(NotifierService);
  private readonly lookup = inject(AccountLookupService);
  protected readonly ref = inject(DynamicDialogRef);
  protected readonly link = (inject(DynamicDialogConfig).data as { link: BankAccountLink }).link;

  protected readonly accountOptions = computed(() => toAccountOptions(this.lookup.items()));

  protected readonly form = inject(NonNullableFormBuilder).group({
    accountId: ['', Validators.required],
    importFrom: [new Date(), Validators.required],
  });

  protected readonly submit = injectFormSubmit(
    this.form,
    (value, context) =>
      this.api.link(this.link.id, { accountId: value.accountId, importFrom: toLocalDate(value.importFrom) }, context),
    (linked) => {
      const items = linked.pendingItems;
      this.notifier.success(`Conta vinculada · ${items} ${items === 1 ? 'item' : 'itens'} na fila`);
      this.ref.close(true);
    },
  );

  constructor() {
    this.lookup.ensureLoaded();
  }
}
