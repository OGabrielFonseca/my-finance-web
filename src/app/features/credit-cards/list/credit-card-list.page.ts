import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { injectCrudList } from '@shared/crud/list';
import type { FilterField } from '@shared/crud/filter';
import { FilterBarComponent } from '@shared/crud/filter';
import { CrudActionsService, CrudPageComponent } from '@shared/crud/page';
import type { ColumnDef, RowActionDef, RowActionEvent } from '@shared/crud/table';
import { ARCHIVE_ACTION, DataTableComponent, EDIT_ACTION } from '@shared/crud/table';

import { CreditCardApiService } from '../data/credit-card-api.service';
import type { CreditCard, CreditCardFilter } from '../data/credit-card.model';
import { CreditCardFormComponent } from '../form/credit-card-form.component';

const OPEN_ACTION: RowActionDef<CreditCard> = { id: 'open', label: 'Abrir', icon: 'pi pi-arrow-right' };

@Component({
  selector: 'app-credit-card-list-page',
  imports: [CrudPageComponent, DataTableComponent, FilterBarComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './credit-card-list.page.html',
})
export class CreditCardListPage {
  private readonly api = inject(CreditCardApiService);
  private readonly crud = inject(CrudActionsService);
  private readonly router = inject(Router);

  protected readonly initialFilter: Partial<CreditCardFilter> = { archived: false };
  protected readonly filters: FilterField[] = [
    { key: 'name', type: 'text', label: 'Nome' },
    { key: 'archived', type: 'boolean', label: 'Somente arquivados' },
  ];
  protected readonly columns: ColumnDef<CreditCard>[] = [
    { field: 'name', header: 'Nome' },
    { field: 'brand', header: 'Bandeira', hideOnMobile: true },
    { field: 'creditLimit', header: 'Limite', type: 'money', hideOnMobile: true },
    { field: 'closingDay', header: 'Dia de fechamento', align: 'center', hideOnMobile: true },
    { field: 'dueDay', header: 'Dia de vencimento', align: 'center' },
  ];
  protected readonly actions: RowActionDef<CreditCard>[] = [
    OPEN_ACTION,
    EDIT_ACTION,
    { ...ARCHIVE_ACTION, visible: (card) => !card.archived },
  ];

  protected readonly list = injectCrudList(this.api, {
    sort: { field: 'name', direction: 'asc' },
    initialFilter: this.initialFilter,
  });

  protected openForm(card?: CreditCard): void {
    const header = card ? 'Editar cartão' : 'Novo cartão';
    this.crud.openForm(CreditCardFormComponent, header, { id: card?.id }).subscribe((saved) => {
      if (saved) this.list.reload();
    });
  }

  protected onAction({ id, row }: RowActionEvent<CreditCard>): void {
    if (id === OPEN_ACTION.id) void this.router.navigate(['/credit-cards', row.id]);
    if (id === EDIT_ACTION.id) this.openForm(row);
    if (id === ARCHIVE_ACTION.id) {
      this.crud.confirmAndRun('archive', row.name, () => this.api.archive(row.id)).subscribe(() => this.list.reload());
    }
  }
}
