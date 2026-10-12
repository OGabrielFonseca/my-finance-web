import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, effect, inject, signal, untracked } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { CellDirective } from '@shared/crud/cell.directive';
import type { ColumnDef, RowActionDef, RowActionEvent } from '@shared/crud/column';
import { ARCHIVE_ACTION, EDIT_ACTION } from '@shared/crud/column';
import { CrudActions } from '@shared/crud/crud-actions';
import { injectCrudList } from '@shared/crud/crud-list';
import { CrudPageComponent } from '@shared/crud/crud-page.component';
import { DataTableComponent } from '@shared/crud/data-table.component';
import type { FilterField } from '@shared/crud/filter';
import { FilterBarComponent } from '@shared/crud/filter-bar.component';
import { MoneyComponent } from '@shared/ui/money.component';
import { Skeleton } from 'primeng/skeleton';
import { forkJoin } from 'rxjs';

import { AccountApi } from '../data/account.api';
import { AccountLookup } from '../data/account.lookup';
import type { Account, AccountBalance, AccountFilter } from '../data/account.model';
import { ACCOUNT_TYPES } from '../data/account.model';
import { AccountFormComponent } from '../form/account-form.component';

@Component({
  selector: 'app-account-list-page',
  imports: [
    CurrencyPipe,
    TranslocoPipe,
    CellDirective,
    CrudPageComponent,
    DataTableComponent,
    FilterBarComponent,
    MoneyComponent,
    Skeleton,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './account-list.page.html',
})
export class AccountListPage {
  private readonly api = inject(AccountApi);
  private readonly lookup = inject(AccountLookup);
  private readonly crud = inject(CrudActions);

  protected readonly initialFilter: Partial<AccountFilter> = { archived: false };
  protected readonly filters: FilterField[] = [
    { key: 'name', type: 'text', label: 'accounts.fields.name' },
    { key: 'type', type: 'enum', label: 'accounts.fields.type', enumKey: 'accountType', options: ACCOUNT_TYPES },
    { key: 'archived', type: 'boolean', label: 'common.onlyArchived' },
  ];
  protected readonly columns: ColumnDef<Account>[] = [
    { field: 'name', header: 'accounts.fields.name' },
    { field: 'type', header: 'accounts.fields.type', type: 'enum', enumKey: 'accountType' },
    { field: 'institution', header: 'accounts.fields.institution', hideOnMobile: true },
    { field: 'initialBalance', header: 'accounts.fields.initialBalance', type: 'money', hideOnMobile: true },
    { field: 'id', key: 'balance', header: 'accounts.fields.balance', sortField: false, align: 'right' },
  ];
  protected readonly actions: RowActionDef<Account>[] = [
    EDIT_ACTION,
    { ...ARCHIVE_ACTION, visible: (account) => !account.archived },
  ];

  protected readonly list = injectCrudList(this.api, {
    sort: { field: 'name', direction: 'asc' },
    initialFilter: this.initialFilter,
    filterFields: this.filters,
  });

  /** Saldo por conta visível: a listagem não traz saldo, então é uma chamada /balance por linha (poucas contas). */
  protected readonly balances = signal<Record<string, AccountBalance>>({});

  constructor() {
    effect(() => {
      const missing = this.list.items().filter((account) => !(account.id in untracked(this.balances)));
      if (!missing.length) return;
      forkJoin(missing.map((account) => this.api.balance(account.id))).subscribe((result) =>
        this.balances.update((current) => ({
          ...current,
          ...Object.fromEntries(result.map((balance) => [balance.accountId, balance])),
        })),
      );
    });
  }

  protected openForm(account?: Account): void {
    const header = account ? 'accounts.editTitle' : 'accounts.newTitle';
    this.crud.openForm(AccountFormComponent, header, { id: account?.id }).subscribe((saved) => {
      if (saved) this.refresh();
    });
  }

  protected onAction({ id, row }: RowActionEvent<Account>): void {
    if (id === EDIT_ACTION.id) this.openForm(row);
    if (id === ARCHIVE_ACTION.id) {
      this.crud.confirmAndRun('archive', row.name, () => this.api.archive(row.id)).subscribe(() => this.refresh());
    }
  }

  private refresh(): void {
    this.balances.set({});
    this.lookup.invalidate();
    this.list.reload();
  }
}
