import type { CategorySummary } from '../../categories/data/category.model';

export const IMPORT_STATUSES = ['PENDING', 'APPROVED', 'IGNORED'] as const;
export type ImportStatus = (typeof IMPORT_STATUSES)[number];

/** Item da fila de revisão (GET /imports). */
export interface ImportItem {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER';
  account: { id: string; name: string; type: string };
  externalCategoryName: string | null;
  suggestedCategory: CategorySummary | null;
  possibleTransfer: boolean;
  /** Lançamento parecido já existente (mesma conta, tipo e valor, data ± 3 dias). */
  possibleDuplicate: { id: string; description: string; date: string } | null;
  status: ImportStatus;
}

/** Query params de GET /imports. `from`/`to` vêm do período; `accountLinkId` é o vínculo da conta de origem. */
export interface ImportFilter {
  status: ImportStatus;
  accountLinkId: string;
  possibleTransfer: 'true';
  from: string;
  to: string;
}

export interface ApproveItem {
  id: string;
  categoryId: string;
}

export interface ApproveRequest {
  items: ApproveItem[];
}

export interface ApproveResponse {
  approved: number;
}

export interface IgnoreRequest {
  ids: string[];
}

export interface ImportCount {
  pending: number;
}

/** Separa a seleção: os itens com categoria viram a requisição; os sem categoria ficam de fora e são contados. */
export function toApproveRequest(
  selected: readonly ImportItem[],
  categoryByItem: ReadonlyMap<string, string>,
): { request: ApproveRequest; withoutCategory: number } {
  const items: ApproveItem[] = [];
  let withoutCategory = 0;
  for (const item of selected) {
    const categoryId = categoryByItem.get(item.id);
    if (categoryId) items.push({ id: item.id, categoryId });
    else withoutCategory++;
  }
  return { request: { items }, withoutCategory };
}
