import type { TableLazyLoadEvent } from 'primeng/table';

import type { PageRequest, SortSpec } from '../../data/page';

export type ColumnType = 'text' | 'money' | 'date' | 'month' | 'enum' | 'boolean' | 'color';

export interface ColumnDef<T> {
  field: keyof T & string;
  /** Identificador da coluna e do template de célula (appCell). Padrão: field. Use para colunas calculadas. */
  key?: string;
  header: string; // chave i18n
  type?: ColumnType;
  enumKey?: string; // ex.: 'accountType' → enums.accountType.CHECKING
  /** Atributo da ENTIDADE para ?sort= (o nome no DTO pode diferir). Padrão: field. false = não ordena. */
  sortField?: string | false;
  width?: string;
  align?: 'left' | 'right' | 'center'; // money é 'right' por padrão
  /** Esconde a coluna em telas pequenas (< 768 px). */
  hideOnMobile?: boolean;
}

export interface RowActionDef<T> {
  id: string;
  label: string; // chave i18n
  icon: string;
  visible?: (row: T) => boolean;
}

export interface RowActionEvent<T> {
  id: string;
  row: T;
}

export const EDIT_ACTION = { id: 'edit', label: 'Editar', icon: 'pi pi-pencil' } as const;
export const ARCHIVE_ACTION = { id: 'archive', label: 'Arquivar', icon: 'pi pi-inbox' } as const;
export const DELETE_ACTION = { id: 'delete', label: 'Excluir', icon: 'pi pi-trash' } as const;

export function columnKey<T>(column: ColumnDef<T>): string {
  return column.key ?? column.field;
}

export function isSortable<T>(column: ColumnDef<T>): boolean {
  return column.sortField !== false;
}

/** Converte o onLazyLoad do p-table em PageRequest, traduzindo a coluna para o atributo da entidade. */
export function toPageRequest<T>(
  event: TableLazyLoadEvent,
  columns: readonly ColumnDef<T>[],
  current: PageRequest,
): PageRequest {
  const size = event.rows ?? current.size;
  const page = Math.floor((event.first ?? 0) / size);
  const column = columns.find((c) => columnKey(c) === event.sortField);
  const sort: SortSpec | undefined =
    column && isSortable(column)
      ? {
          field: (column.sortField as string | undefined) ?? column.field,
          direction: event.sortOrder === -1 ? 'desc' : 'asc',
        }
      : current.sort;
  return { page, size, sort };
}

/** Ordenação atual → sortField/sortOrder do p-table (o inverso de toPageRequest). */
export function toTableSort<T>(
  sort: SortSpec | undefined,
  columns: readonly ColumnDef<T>[],
): { field: string | undefined; order: number } {
  const column =
    sort && columns.find((c) => isSortable(c) && ((c.sortField as string | undefined) ?? c.field) === sort.field);
  return { field: column ? columnKey(column) : undefined, order: sort?.direction === 'desc' ? -1 : 1 };
}
