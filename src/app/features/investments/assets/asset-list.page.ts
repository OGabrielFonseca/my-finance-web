import { EnumLabelPipe } from '@shared/i18n/enum-labels';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { injectCrudList } from '@shared/crud/list';
import type { FilterField } from '@shared/crud/filter';
import { FilterBarComponent } from '@shared/crud/filter';
import { CrudActionsService, CrudPageComponent } from '@shared/crud/page';
import type { ColumnDef, RowActionDef, RowActionEvent } from '@shared/crud/table';
import { CellDirective, DELETE_ACTION, DataTableComponent, EDIT_ACTION } from '@shared/crud/table';

import { InvestmentsNavComponent } from '../nav/investments-nav.component';
import { AssetApiService } from '../data/asset-api.service';
import { AssetLookupService } from '../data/asset-lookup.service';
import type { Asset } from '../data/investment.model';
import { ASSET_CLASSES } from '../data/investment.model';
import { AssetFormComponent } from './asset-form.component';
import { AssetPositionComponent } from './asset-position.component';

const POSITION_ACTION: RowActionDef<Asset> = {
  id: 'position',
  label: 'Posição',
  icon: 'pi pi-eye',
};

@Component({
  selector: 'app-asset-list-page',
  imports: [
    EnumLabelPipe,
    CellDirective,
    CrudPageComponent,
    DataTableComponent,
    FilterBarComponent,
    InvestmentsNavComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './asset-list.page.html',
})
export class AssetListPage {
  private readonly api = inject(AssetApiService);
  private readonly lookup = inject(AssetLookupService);
  private readonly crud = inject(CrudActionsService);

  protected readonly filters: FilterField[] = [
    { key: 'search', type: 'text', label: 'Buscar por ticker ou nome' },
    {
      key: 'assetClass',
      type: 'enum',
      label: 'Classe',
      enumKey: 'assetClass',
      options: ASSET_CLASSES,
    },
  ];
  protected readonly columns: ColumnDef<Asset>[] = [
    { field: 'ticker', header: 'Ticker' },
    { field: 'name', header: 'Nome', hideOnMobile: true },
    { field: 'assetClass', header: 'Classe', type: 'enum', enumKey: 'assetClass' },
    {
      field: 'fixedIncome',
      key: 'fixedIncome',
      header: 'Renda fixa',
      sortField: false,
      hideOnMobile: true,
    },
  ];
  protected readonly actions: RowActionDef<Asset>[] = [POSITION_ACTION, EDIT_ACTION, DELETE_ACTION];

  protected readonly list = injectCrudList(this.api, {
    sort: { field: 'ticker', direction: 'asc' },
  });

  protected openForm(asset?: Asset): void {
    const header = asset ? 'Editar ativo' : 'Novo ativo';
    this.crud.openForm(AssetFormComponent, header, { id: asset?.id }).subscribe((saved) => {
      if (saved) this.refresh();
    });
  }

  protected onAction({ id, row }: RowActionEvent<Asset>): void {
    if (id === POSITION_ACTION.id) this.crud.openForm(AssetPositionComponent, 'Posição', { id: row.id }).subscribe();
    if (id === EDIT_ACTION.id) this.openForm(row);
    if (id === DELETE_ACTION.id) {
      this.crud.confirmAndRun('delete', row.ticker, () => this.api.delete(row.id)).subscribe(() => this.refresh());
    }
  }

  private refresh(): void {
    this.lookup.invalidate();
    this.list.reload();
  }
}
