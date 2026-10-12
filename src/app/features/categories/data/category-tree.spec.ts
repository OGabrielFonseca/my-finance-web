import { buildCategoryTree, toCategoryOptions } from './category-tree';
import type { Category, CategorySummary } from './category.model';

function category(
  id: string,
  name: string,
  parentId: string | null = null,
  type: Category['type'] = 'EXPENSE',
): Category {
  return {
    id,
    name,
    parentId,
    type,
    color: '#000000',
    icon: null,
    archived: false,
    system: false,
    createdAt: '',
    updatedAt: '',
  };
}

const items: Category[] = [
  category('t', 'Transporte'),
  category('m', 'Mercado', 'a'),
  category('a', 'Alimentação'),
  category('r', 'Restaurantes', 'a'),
  category('c', 'Combustível', 't'),
  category('s', 'Salário', null, 'INCOME'),
];

describe('buildCategoryTree', () => {
  it('ordena raízes e filhas por nome e expande tudo', () => {
    const tree = buildCategoryTree(items);
    expect(tree.map((n) => n.data?.name)).toEqual(['Alimentação', 'Salário', 'Transporte']);
    expect(tree[0].children?.map((n) => n.data?.name)).toEqual(['Mercado', 'Restaurantes']);
    expect(tree[0].expanded).toBe(true);
    expect(tree[0].key).toBe('a');
  });

  it('filha sem o pai na lista vira raiz (ex.: filtro de arquivadas)', () => {
    const tree = buildCategoryTree([category('m', 'Mercado', 'a')]);
    expect(tree.map((n) => n.data?.name)).toEqual(['Mercado']);
  });
});

describe('toCategoryOptions', () => {
  const summaries: CategorySummary[] = items.map(({ id, name, type, color, icon, parentId }) => ({
    id,
    name,
    type,
    color,
    icon,
    parentId,
  }));

  it('lista em ordem de árvore com profundidade', () => {
    expect(toCategoryOptions(summaries, 'EXPENSE').map((o) => `${o.depth}:${o.label}`)).toEqual([
      '0:Alimentação',
      '1:Mercado',
      '1:Restaurantes',
      '0:Transporte',
      '1:Combustível',
    ]);
  });

  it('filtra pelo tipo e leva a cor', () => {
    expect(toCategoryOptions(summaries, 'INCOME')).toEqual([
      { value: 's', label: 'Salário', depth: 0, color: '#000000' },
    ]);
  });
});
