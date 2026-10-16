import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { AccountLookupService, toAccountOptions } from '@features/accounts';
import { injectCrudList } from '@shared/crud/list';
import type { FilterField } from '@shared/crud/filter';
import { FilterBarComponent } from '@shared/crud/filter';
import { CrudActionsService, CrudPageComponent } from '@shared/crud/page';
import type { ColumnDef, RowActionDef, RowActionEvent } from '@shared/crud/table';
import { DELETE_ACTION, DataTableComponent, EDIT_ACTION } from '@shared/crud/table';
import { CellDirective } from '@shared/crud/table';

import { InvestmentsNavComponent } from '../nav/investments-nav.component';
import { AssetLookupService } from '../data/asset-lookup.service';
import { IncomeApiService } from '../data/income-api.service';
import type { Income, IncomeFilter } from '../data/investment.model';
import { INCOME_TYPES, toAssetOptions } from '../data/investment.model';
import { IncomeFormComponent } from './income-form.component';

@Component({
  selector: 'app-income-list-page',
  imports: [CellDirective, CrudPageComponent, DataTableComponent, FilterBarComponent, InvestmentsNavComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './income-list.page.html',
})
export class IncomeListPage {
  private readonly api = inject(IncomeApiService);
  private readonly accounts = inject(AccountLookupService);
  private readonly assets = inject(AssetLookupService);
  private readonly crud = inject(CrudActionsService);

  protected readonly assetOptions = computed(() => toAssetOptions(this.assets.items()));
  protected readonly accountOptions = computed(() => toAccountOptions(this.accounts.items()));

  protected readonly filters: FilterField[] = [
    { key: 'assetId', type: 'lookup', label: 'Ativo', options: this.assetOptions },
    { key: 'accountId', type: 'lookup', label: 'Corretora', options: this.accountOptions },
    {
      key: 'type',
      type: 'enum',
      label: 'Tipo',
      enumKey: 'incomeType',
      options: INCOME_TYPES,
    },
    { key: 'period', type: 'dateRange', label: 'Período', fromKey: 'from', toKey: 'to' },
  ];
  protected readonly columns: ColumnDef<Income>[] = [
    { field: 'paymentDate', header: 'Pagamento', type: 'date' },
    { field: 'asset', key: 'asset', header: 'Ativo', sortField: false },
    { field: 'type', header: 'Tipo', type: 'enum', enumKey: 'incomeType' },
    { field: 'grossAmount', header: 'Bruto', type: 'money', align: 'right' },
    {
      field: 'taxAmount',
      header: 'Imposto',
      type: 'money',
      align: 'right',
      hideOnMobile: true,
    },
    { field: 'netAmount', header: 'Líquido', type: 'money', align: 'right' },
  ];
  protected readonly actions: RowActionDef<Income>[] = [EDIT_ACTION, DELETE_ACTION];

  protected readonly list = injectCrudList<Income, IncomeFilter>(this.api, {
    sort: { field: 'paymentDate', direction: 'desc' },
  });

  constructor() {
    this.accounts.ensureLoaded();
    this.assets.ensureLoaded();
  }

  protected openForm(income?: Income): void {
    const header = income ? 'Editar provento' : 'Novo provento';
    this.crud.openForm(IncomeFormComponent, header, { income }).subscribe((saved) => {
      if (saved) this.list.reload();
    });
  }

  protected onAction({ id, row }: RowActionEvent<Income>): void {
    if (id === EDIT_ACTION.id) this.openForm(row);
    if (id === DELETE_ACTION.id) {
      this.crud
        .confirmAndRun('delete', row.asset.ticker, () => this.api.delete(row.id))
        .subscribe(() => this.list.reload());
    }
  }
}
