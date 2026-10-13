import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';
import { injectCrudList } from '@shared/crud/list';
import { CrudActionsService, CrudPageComponent } from '@shared/crud/page';
import type { ColumnDef, RowActionDef, RowActionEvent } from '@shared/crud/table';
import { CellDirective, DELETE_ACTION, DataTableComponent, EDIT_ACTION } from '@shared/crud/table';
import { toLocalDate } from '@shared/data';
import { DatePicker } from 'primeng/datepicker';
import { ProgressBar } from 'primeng/progressbar';

import { BudgetApiService } from '../data/budget-api.service';
import type { Budget, BudgetFilter } from '../data/budget.model';
import { BudgetFormComponent } from '../form/budget-form.component';

/** Primeiro dia do mês de uma data (o orçamento é guardado por mês, no dia 1). */
const firstOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);

@Component({
  selector: 'app-budget-list-page',
  imports: [CellDirective, CrudPageComponent, DataTableComponent, DatePicker, FormsModule, ProgressBar, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './budget-list.page.html',
})
export class BudgetListPage {
  private readonly api = inject(BudgetApiService);
  private readonly crud = inject(CrudActionsService);

  protected readonly month = signal(firstOfMonth(new Date()));

  protected readonly list = injectCrudList(this.api, {
    sort: { field: 'month', direction: 'desc' },
    initialFilter: { month: toLocalDate(this.month()) } satisfies Partial<BudgetFilter>,
  });

  protected readonly columns: ColumnDef<Budget>[] = [
    { field: 'category', key: 'category', header: 'budgets.fields.category', sortField: false },
    { field: 'amount', header: 'budgets.fields.amount', type: 'money', align: 'right' },
    { field: 'spent', header: 'budgets.fields.spent', type: 'money', align: 'right', hideOnMobile: true },
    { field: 'spent', key: 'progress', header: 'budgets.fields.progress', sortField: false, width: '14rem' },
  ];
  protected readonly actions: RowActionDef<Budget>[] = [EDIT_ACTION, DELETE_ACTION];

  /** Percentual gasto, limitado a 100 para a barra. Acima do planejado a barra fica cheia. */
  protected percentOf(budget: Budget): number {
    return budget.amount > 0 ? Math.min(100, (budget.spent / budget.amount) * 100) : 0;
  }

  protected onMonthChange(value: Date | null): void {
    if (!value) return;
    const first = firstOfMonth(value);
    this.month.set(first);
    this.list.setFilter({ month: toLocalDate(first) });
  }

  protected openForm(budget?: Budget): void {
    const header = budget ? 'budgets.editTitle' : 'budgets.newTitle';
    this.crud.openForm(BudgetFormComponent, header, { budget, month: this.month() }).subscribe((saved) => {
      if (saved) this.list.reload();
    });
  }

  protected onAction({ id, row }: RowActionEvent<Budget>): void {
    if (id === EDIT_ACTION.id) this.openForm(row);
    if (id === DELETE_ACTION.id) {
      this.crud
        .confirmAndRun('delete', row.category.name, () => this.api.delete(row.id))
        .subscribe(() => this.list.reload());
    }
  }
}
