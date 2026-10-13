import { isFixedIncomeClass, isTradeType, toAssetOptions } from './investment.model';

describe('investment.model', () => {
  it('só renda fixa e Tesouro têm detalhes de renda fixa', () => {
    expect(isFixedIncomeClass('FIXED_INCOME')).toBe(true);
    expect(isFixedIncomeClass('TREASURY')).toBe(true);
    expect(isFixedIncomeClass('STOCK')).toBe(false);
    expect(isFixedIncomeClass(null)).toBe(false);
  });

  it('só compra e venda são operações com preço e taxas', () => {
    expect(isTradeType('BUY')).toBe(true);
    expect(isTradeType('SELL')).toBe(true);
    expect(isTradeType('SPLIT')).toBe(false);
    expect(isTradeType('BONUS')).toBe(false);
    expect(isTradeType(null)).toBe(false);
  });

  it('toAssetOptions mostra ticker e nome, com o id como valor', () => {
    const options = toAssetOptions([{ id: 'a1', ticker: 'PETR4', name: 'Petrobras', assetClass: 'STOCK' }]);

    expect(options).toEqual([{ value: 'a1', label: 'PETR4 · Petrobras' }]);
  });
});
