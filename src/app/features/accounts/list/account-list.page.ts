import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, effect, inject, signal, untracked } from '@angular/core';
import { CellDirective } from '@shared/crud/table';
import type { ColumnDef, RowActionDef, RowActionEvent } from '@shared/crud/table';
import { ARCHIVE_ACTION, EDIT_ACTION } from '@shared/crud/table';
import { CrudActionsService } from '@shared/crud/page';
import { injectCrudList } from '@shared/crud/list';
import { CrudPageComponent } from '@shared/crud/page';
import { DataTableComponent } from '@shared/crud/table';
import type { FilterField } from '@shared/crud/filter';
import { FilterBarComponent } from '@shared/crud/filter';
import { MoneyComponent } from '@shared/ui';
import { Skeleton } from 'primeng/skeleton';
import { forkJoin } from 'rxjs';

import { AccountApiService } from '../data/account-api.service';
import { AccountLookupService } from '../data/account-lookup.service';
import type { Account, AccountBalance, AccountFilter } from '../data/account.model';
import { ACCOUNT_TYPES } from '../data/account.model';
import { AccountFormComponent } from '../form/account-form.component';

@Component({
  selector: 'app-account-list-page',
  imports: [
    CurrencyPipe,
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
  private readonly api = inject(AccountApiService);
  private readonly lookup = inject(AccountLookupService);
  private readonly crud = inject(CrudActionsService);

  protected readonly initialFilter: Partial<AccountFilter> = { archived: false };
  protected readonly filters: FilterField[] = [
    { key: 'name', type: 'text', label: 'Nome' },
    { key: 'type', type: 'enum', label: 'Tipo', enumKey: 'accountType', options: ACCOUNT_TYPES },
    { key: 'archived', type: 'boolean', label: 'Somente arquivados' },
  ];
  protected readonly columns: ColumnDef<Account>[] = [
    { field: 'name', header: 'Nome' },
    { field: 'type', header: 'Tipo', type: 'enum', enumKey: 'accountType' },
    { field: 'institution', header: 'Instituição', hideOnMobile: true },
    { field: 'initialBalance', header: 'Saldo inicial', type: 'money', hideOnMobile: true },
    { field: 'id', key: 'balance', header: 'Saldo atual', sortField: false, align: 'right' },
  ];
  protected readonly actions: RowActionDef<Account>[] = [
    EDIT_ACTION,
    { ...ARCHIVE_ACTION, visible: (account) => !account.archived },
  ];

  protected readonly list = injectCrudList(this.api, {
    sort: { field: 'name', direction: 'asc' },
    initialFilter: this.initialFilter,
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
    const header = account ? 'Editar conta' : 'Nova conta';
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
