import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { AccountLookupService, toAccountOptions } from '@features/accounts';
import { ActiveCategoryLookupService, AllCategoryLookupService, toCategoryOptions } from '@features/categories';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { CellDirective } from '@shared/crud/table';
import type { ColumnDef, RowActionDef, RowActionEvent } from '@shared/crud/table';
import { DELETE_ACTION, EDIT_ACTION } from '@shared/crud/table';
import { CrudActionsService } from '@shared/crud/page';
import { injectCrudList } from '@shared/crud/list';
import { CrudPageComponent } from '@shared/crud/page';
import { DataTableComponent } from '@shared/crud/table';
import type { FilterField } from '@shared/crud/filter';
import { FilterBarComponent } from '@shared/crud/filter';
import { toLocalDate } from '@shared/data';
import { MoneyComponent } from '@shared/ui';
import type { MenuItem } from 'primeng/api';
import { Button } from 'primeng/button';
import { Menu } from 'primeng/menu';
import { Tag } from 'primeng/tag';

import { TransactionApiService } from '../data/transaction-api.service';
import type { Transaction, TransactionFilter } from '../data/transaction.model';
import { TRANSACTION_STATUSES, TRANSACTION_TYPES, readOnlyReason, toUpdateRequest } from '../data/transaction.model';
import type { TransactionFormData } from '../form/transaction-form.component';
import { TransactionFormComponent } from '../form/transaction-form.component';
import { TransferFormComponent } from '../form/transfer-form.component';

const CLEAR_ACTION = { id: 'clear', label: 'transactions.clear', icon: 'pi pi-check' } as const;

function currentMonth(): Partial<TransactionFilter> {
  const today = new Date();
  return {
    from: toLocalDate(new Date(today.getFullYear(), today.getMonth(), 1)),
    to: toLocalDate(new Date(today.getFullYear(), today.getMonth() + 1, 0)),
  };
}

@Component({
  selector: 'app-transaction-list-page',
  imports: [
    TranslocoPipe,
    CellDirective,
    CrudPageComponent,
    DataTableComponent,
    FilterBarComponent,
    MoneyComponent,
    Button,
    Menu,
    Tag,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './transaction-list.page.html',
})
export class TransactionListPage {
  private readonly api = inject(TransactionApiService);
  private readonly crud = inject(CrudActionsService);
  private readonly transloco = inject(TranslocoService);
  private readonly accountLookup = inject(AccountLookupService);
  private readonly activeCategoryLookup = inject(ActiveCategoryLookupService);
  private readonly allCategoryLookup = inject(AllCategoryLookupService);

  /** Ids das categorias não-sistema; null enquanto não carregou. */
  private readonly knownCategoryIds = computed(() =>
    this.allCategoryLookup.loaded() ? new Set(this.allCategoryLookup.items().map((c) => c.id)) : null,
  );

  protected readonly initialFilter = currentMonth();
  protected readonly filters: FilterField[] = [
    { key: 'period', type: 'dateRange', label: 'transactions.fields.period', fromKey: 'from', toKey: 'to' },
    { key: 'description', type: 'text', label: 'transactions.fields.description' },
    {
      key: 'accountId',
      type: 'lookup',
      label: 'transactions.fields.account',
      options: computed(() => toAccountOptions(this.accountLookup.items())),
    },
    {
      key: 'categoryId',
      type: 'lookup',
      label: 'transactions.fields.category',
      options: computed(() => toCategoryOptions(this.activeCategoryLookup.items())),
    },
    {
      key: 'type',
      type: 'enum',
      label: 'transactions.fields.type',
      enumKey: 'transactionType',
      options: TRANSACTION_TYPES,
    },
    {
      key: 'status',
      type: 'enum',
      label: 'transactions.fields.status',
      enumKey: 'transactionStatus',
      options: TRANSACTION_STATUSES,
    },
  ];
  protected readonly columns: ColumnDef<Transaction>[] = [
    { field: 'date', header: 'transactions.fields.date', type: 'date', sortField: 'transactionDate', width: '8rem' },
    { field: 'description', header: 'transactions.fields.description' },
    { field: 'category', header: 'transactions.fields.category', sortField: false, hideOnMobile: true },
    { field: 'account', header: 'transactions.fields.account', sortField: false, hideOnMobile: true },
    { field: 'status', header: 'transactions.fields.status', hideOnMobile: true },
    { field: 'amount', header: 'transactions.fields.amount', align: 'right' },
  ];
  private readonly editable = (t: Transaction) => readOnlyReason(t, this.knownCategoryIds()) === null;
  protected readonly actions: RowActionDef<Transaction>[] = [
    { ...EDIT_ACTION, visible: this.editable },
    { ...CLEAR_ACTION, visible: (t) => this.editable(t) && t.status === 'PENDING' },
    { ...DELETE_ACTION, visible: this.editable },
  ];
  protected readonly newItems: MenuItem[] = (['INCOME', 'EXPENSE', 'TRANSFER'] as const).map((type) => ({
    label: this.transloco.translate(`enums.transactionType.${type}`),
    icon:
      type === 'TRANSFER' ? 'pi pi-arrow-right-arrow-left' : type === 'INCOME' ? 'pi pi-arrow-up' : 'pi pi-arrow-down',
    command: () => this.create(type),
  }));

  protected readonly list = injectCrudList(this.api, {
    sort: { field: 'transactionDate', direction: 'desc' },
    initialFilter: this.initialFilter,
    filterFields: this.filters,
  });

  constructor() {
    this.accountLookup.ensureLoaded();
    this.activeCategoryLookup.ensureLoaded();
    this.allCategoryLookup.ensureLoaded();
  }

  protected readOnly(t: Transaction) {
    return readOnlyReason(t, this.knownCategoryIds());
  }

  protected onAction({ id, row }: RowActionEvent<Transaction>): void {
    if (id === EDIT_ACTION.id) this.edit(row);
    if (id === CLEAR_ACTION.id) {
      this.crud
        .run(() => this.api.update(row.id, toUpdateRequest(row, { status: 'CLEARED' })), 'transactions.cleared')
        .subscribe(() => this.list.reload());
    }
    if (id === DELETE_ACTION.id) {
      this.crud
        .confirmAndRun('delete', row.description, () => this.api.delete(row.id))
        .subscribe(() => this.list.reload());
    }
  }

  private create(type: 'INCOME' | 'EXPENSE' | 'TRANSFER'): void {
    const header = `transactions.newTitle.${type}`;
    if (type === 'TRANSFER') this.reloadWhenSaved(this.crud.openForm(TransferFormComponent, header));
    else
      this.reloadWhenSaved(
        this.crud.openForm(TransactionFormComponent, header, { type } satisfies TransactionFormData),
      );
  }

  private edit(transaction: Transaction): void {
    if (transaction.type === 'TRANSFER') {
      this.reloadWhenSaved(
        this.crud.openForm(TransferFormComponent, 'transactions.editTransferTitle', { transaction }),
      );
    } else {
      const data: TransactionFormData = { type: transaction.type, transaction };
      this.reloadWhenSaved(this.crud.openForm(TransactionFormComponent, 'transactions.editTitle', data));
    }
  }

  private reloadWhenSaved(saved$: ReturnType<CrudActionsService['openForm']>): void {
    saved$.subscribe((saved) => {
      if (saved) this.list.reload();
    });
  }
}
