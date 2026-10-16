import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { AccountLookupService, toAccountOptions } from '@features/accounts';
import { injectCrudList } from '@shared/crud/list';
import type { FilterField } from '@shared/crud/filter';
import { FilterBarComponent } from '@shared/crud/filter';
import { CrudActionsService, CrudPageComponent } from '@shared/crud/page';
import type { ColumnDef, RowActionDef, RowActionEvent } from '@shared/crud/table';
import { CellDirective, DELETE_ACTION, DataTableComponent, EDIT_ACTION } from '@shared/crud/table';

import { InvestmentsNavComponent } from '../nav/investments-nav.component';
import { AssetLookupService } from '../data/asset-lookup.service';
import { OperationApiService } from '../data/operation-api.service';
import type { Operation, OperationFilter } from '../data/investment.model';
import { OPERATION_TYPES, toAssetOptions } from '../data/investment.model';
import { OperationFormComponent } from './operation-form.component';

@Component({
  selector: 'app-operation-list-page',
  imports: [CellDirective, CrudPageComponent, DataTableComponent, FilterBarComponent, InvestmentsNavComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './operation-list.page.html',
})
export class OperationListPage {
  private readonly api = inject(OperationApiService);
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
      enumKey: 'operationType',
      options: OPERATION_TYPES,
    },
    { key: 'period', type: 'dateRange', label: 'Período', fromKey: 'from', toKey: 'to' },
  ];
  protected readonly columns: ColumnDef<Operation>[] = [
    { field: 'operationDate', header: 'Data', type: 'date' },
    { field: 'asset', key: 'asset', header: 'Ativo', sortField: false },
    { field: 'type', header: 'Tipo', type: 'enum', enumKey: 'operationType' },
    { field: 'quantity', header: 'Quantidade', align: 'right' },
    {
      field: 'unitPrice',
      header: 'Preço unitário',
      type: 'money',
      align: 'right',
      hideOnMobile: true,
    },
    { field: 'fees', header: 'Taxas', type: 'money', align: 'right', hideOnMobile: true },
  ];

  protected readonly actions: RowActionDef<Operation>[] = [EDIT_ACTION, DELETE_ACTION];

  protected readonly list = injectCrudList<Operation, OperationFilter>(this.api, {
    sort: { field: 'operationDate', direction: 'desc' },
  });

  constructor() {
    this.accounts.ensureLoaded();
    this.assets.ensureLoaded();
  }

  protected openForm(operation?: Operation): void {
    const header = operation ? 'Editar operação' : 'Nova operação';
    this.crud.openForm(OperationFormComponent, header, { operation }).subscribe((saved) => {
      if (saved) this.list.reload();
    });
  }

  protected onAction({ id, row }: RowActionEvent<Operation>): void {
    if (id === EDIT_ACTION.id) this.openForm(row);
    if (id === DELETE_ACTION.id) {
      this.crud
        .confirmAndRun('delete', row.asset.ticker, () => this.api.delete(row.id))
        .subscribe(() => this.list.reload());
    }
  }
}
