import type { ImportItem } from './import.model';
import { toApproveRequest } from './import.model';

function item(id: string): ImportItem {
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
  };
}

describe('toApproveRequest', () => {
  it('monta a requisição com os itens que têm categoria', () => {
    const categories = new Map([
      ['a', 'cat-1'],
      ['b', 'cat-2'],
    ]);

    const result = toApproveRequest([item('a'), item('b')], categories);

    expect(result.request).toEqual({
      items: [
        { id: 'a', categoryId: 'cat-1' },
        { id: 'b', categoryId: 'cat-2' },
      ],
    });
    expect(result.withoutCategory).toBe(0);
  });

  it('deixa de fora os itens sem categoria e os conta', () => {
    const categories = new Map([['a', 'cat-1']]);

    const result = toApproveRequest([item('a'), item('b'), item('c')], categories);

    expect(result.request.items).toEqual([{ id: 'a', categoryId: 'cat-1' }]);
    expect(result.withoutCategory).toBe(2);
  });

  it('devolve requisição vazia quando nenhum item tem categoria', () => {
    const result = toApproveRequest([item('a')], new Map());

    expect(result.request.items).toEqual([]);
    expect(result.withoutCategory).toBe(1);
  });
});
