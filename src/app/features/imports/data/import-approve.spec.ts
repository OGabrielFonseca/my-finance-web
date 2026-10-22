import type { ImportItem } from './import.model';
import { isInvoicePayment, toApproveRequest } from './import.model';

function item(id: string, overrides: Partial<ImportItem> = {}): ImportItem {
  return {
    id,
    date: '2026-10-10',
    description: `Item ${id}`,
    amount: 10,
    type: 'EXPENSE',
    account: { id: 'acc-1', name: 'Conta', type: 'CHECKING' },
    externalCategoryName: null,
    suggestedCategory: null,
    possibleTransfer: false,
    possibleDuplicate: null,
    status: 'PENDING',
    kind: 'ACCOUNT_TRANSACTION',
    card: null,
    installmentNumber: null,
    installmentTotal: null,
    suggestedInvoiceId: null,
    possibleDuplicatePurchase: false,
    ...overrides,
  };
}

const purchase = (id: string): ImportItem =>
  item(id, {
    kind: 'CARD_PURCHASE',
    account: null,
    card: { id: 'card-1', name: 'Nubank', brand: null },
    installmentNumber: 1,
    installmentTotal: 3,
  });

describe('toApproveRequest', () => {
  it('monta a requisição com os itens que têm categoria', () => {
    const categories = new Map([
      ['a', 'cat-1'],
      ['b', 'cat-2'],
    ]);

    const result = toApproveRequest([item('a'), item('b')], categories);

    expect(result.request.items).toEqual([
      { id: 'a', categoryId: 'cat-1' },
      { id: 'b', categoryId: 'cat-2' },
    ]);
    expect(result.withoutCategory).toBe(0);
  });

  it('deixa de fora os itens sem categoria e os conta', () => {
    const result = toApproveRequest([item('a'), item('b'), item('c')], new Map([['a', 'cat-1']]));

    expect(result.request.items).toEqual([{ id: 'a', categoryId: 'cat-1' }]);
    expect(result.withoutCategory).toBe(2);
  });

  it('aprova sugestão de pagamento de fatura sem categoria, com asInvoicePayment', () => {
    const invoice = item('p', { suggestedInvoiceId: 'inv-1' });

    const result = toApproveRequest([invoice], new Map());

    expect(result.request.items).toEqual([{ id: 'p', asInvoicePayment: true }]);
    expect(result.withoutCategory).toBe(0);
  });

  it('compra de cartão sem categoria fica de fora', () => {
    const result = toApproveRequest([purchase('c')], new Map());

    expect(result.request.items).toEqual([]);
    expect(result.withoutCategory).toBe(1);
  });

  it('compra de cartão com categoria vai com categoryId', () => {
    const result = toApproveRequest([purchase('c')], new Map([['c', 'cat-9']]));

    expect(result.request.items).toEqual([{ id: 'c', categoryId: 'cat-9' }]);
  });
});

describe('isInvoicePayment', () => {
  it('só saída de conta com fatura sugerida', () => {
    expect(isInvoicePayment(item('a', { suggestedInvoiceId: 'inv' }))).toBe(true);
    expect(isInvoicePayment(item('b'))).toBe(false);
    expect(isInvoicePayment(purchase('c'))).toBe(false);
  });
});
