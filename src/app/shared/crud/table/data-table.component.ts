import { EnumLabelPipe } from '@shared/i18n/enum-labels';
import { CurrencyPipe, DatePipe, NgTemplateOutlet } from '@angular/common';
import type { TemplateRef } from '@angular/core';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChildren,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import type { MenuItem } from 'primeng/api';
import { Button } from 'primeng/button';
import { Menu } from 'primeng/menu';
import type { TableLazyLoadEvent } from 'primeng/table';
import { TableModule } from 'primeng/table';
import { Tag } from 'primeng/tag';

import { EmptyStateComponent } from '../../ui/empty-state.component';
import { CellDirective } from './cell.directive';
import type { ColumnDef, RowActionDef, RowActionEvent } from './column';
import { columnKey, isSortable, toPageRequest, toTableSort } from './column';
import type { PagedList } from '../list/crud-list';

/** Tabela lazy (paginação e ordenação no servidor) sobre p-table, com colunas declaradas e formatação por tipo. */
@Component({
  selector: 'app-data-table',
  imports: [
    EnumLabelPipe,
    CurrencyPipe,
    DatePipe,
    NgTemplateOutlet,
    Button,
    Menu,
    TableModule,
    Tag,
    EmptyStateComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './data-table.component.html',
})
export class DataTableComponent<T extends { id: string }> {
  readonly columns = input.required<readonly ColumnDef<T>[]>();
  readonly list = input.required<PagedList<T>>();
  readonly actions = input<readonly RowActionDef<T>[]>([]);
  readonly emptyMessage = input('Nenhum registro encontrado.');
  readonly action = output<RowActionEvent<T>>();
  private readonly cells = contentChildren(CellDirective);
  private readonly menu = viewChild.required<Menu>('rowMenu');

  protected readonly menuItems = signal<MenuItem[]>([]);
  protected readonly columnKey = columnKey;
  protected readonly isSortable = isSortable;
  protected readonly tableSort = computed(() => toTableSort(this.list().page().sort, this.columns()));
  protected readonly first = computed(() => this.list().page().page * this.list().page().size);
  protected readonly colspan = computed(() => this.columns().length + (this.actions().length ? 1 : 0));

  protected onLazyLoad(event: TableLazyLoadEvent): void {
    this.list().setPage(toPageRequest(event, this.columns(), this.list().page()));
  }

  protected cellTemplate(column: ColumnDef<T>): TemplateRef<unknown> | null {
    return this.cells().find((cell) => cell.key() === columnKey(column))?.template ?? null;
  }

  protected value(row: T, column: ColumnDef<T>): unknown {
    return row[column.field];
  }

  protected alignClass(column: ColumnDef<T>): string {
    const align = column.align ?? (column.type === 'money' ? 'right' : 'left');
    return [`text-${align}`, column.hideOnMobile ? 'hidden md:table-cell' : ''].join(' ');
  }

  protected isArchived(row: T): boolean {
    return (row as { archived?: unknown }).archived === true;
  }

  protected visibleActions(row: T): readonly RowActionDef<T>[] {
    return this.actions().filter((a) => !a.visible || a.visible(row));
  }

  protected emit(id: string, row: T): void {
    this.action.emit({ id, row });
  }

  protected openMenu(event: Event, row: T): void {
    this.menuItems.set(
      this.visibleActions(row).map((a) => ({
        label: a.label,
        icon: a.icon,
        command: () => this.emit(a.id, row),
      })),
    );
    this.menu().toggle(event);
  }
}
