import type { CreditCardSummary } from '../../credit-cards/data/credit-card.model';
import type { CategorySummary } from '../../categories/data/category.model';

export const IMPORT_STATUSES = ['PENDING', 'APPROVED', 'IGNORED'] as const;
export type ImportStatus = (typeof IMPORT_STATUSES)[number];

export type ImportKind = 'ACCOUNT_TRANSACTION' | 'CARD_PURCHASE';

/** Fatura que uma saída de conta pode pagar (pedido P3 ao backend: ausente até o backend entregar). */
export interface SuggestedInvoice {
  id: string;
  creditCard: CreditCardSummary;
  total: number;
  dueDate: string;
}

/** Item da fila de revisão (GET /imports). */
export interface ImportItem {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER';
  /** Nulo em compra de cartão. */
  account: { id: string; name: string; type: string } | null;
  externalCategoryName: string | null;
  suggestedCategory: CategorySummary | null;
  possibleTransfer: boolean;
  /** Lançamento parecido já existente (mesma conta, tipo e valor, data ± 3 dias). Só ACCOUNT_TRANSACTION. */
  possibleDuplicate: { id: string; description: string; date: string } | null;
  status: ImportStatus;
  kind: ImportKind;
  /** Só CARD_PURCHASE. */
  card: CreditCardSummary | null;
  installmentNumber: number | null;
  installmentTotal: number | null;
  /** Só ACCOUNT_TRANSACTION: saída que pode ser pagamento de fatura. */
  suggestedInvoiceId: string | null;
  suggestedInvoice?: SuggestedInvoice | null;
  /** Só CARD_PURCHASE: compra parecida já lançada à mão no cartão. */
  possibleDuplicatePurchase: boolean;
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
  /** Obrigatório, exceto na sugestão de pagamento de fatura (asInvoicePayment). */
  categoryId?: string;
  /** true aprova a saída como pagamento da fatura sugerida; a categoria de sistema é usada. */
  asInvoicePayment?: boolean;
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

/**
 * Separa a seleção. Sugestão de pagamento de fatura vai com asInvoicePayment e sem categoria. Os demais itens vão com a
 * categoria escolhida; os sem categoria ficam de fora e são contados.
 */
export function toApproveRequest(
  selected: readonly ImportItem[],
  categoryByItem: ReadonlyMap<string, string>,
): { request: ApproveRequest; withoutCategory: number } {
  const items: ApproveItem[] = [];
  let withoutCategory = 0;
  for (const item of selected) {
    if (isInvoicePayment(item)) {
      items.push({ id: item.id, asInvoicePayment: true });
      continue;
    }
    const categoryId = categoryByItem.get(item.id);
    if (categoryId) items.push({ id: item.id, categoryId });
    else withoutCategory++;
  }
  return { request: { items }, withoutCategory };
}

/** Saída de conta que pode pagar uma fatura: aprovada como pagamento, sem categoria. */
export function isInvoicePayment(item: ImportItem): boolean {
  return item.kind === 'ACCOUNT_TRANSACTION' && !!item.suggestedInvoiceId;
}
