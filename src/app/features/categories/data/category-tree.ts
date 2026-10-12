import type { LookupOption } from '@shared/crud/filter';
import type { TreeNode } from 'primeng/api';

import type { Category, CategorySummary, CategoryType } from './category.model';

interface CategoryLike {
  id: string;
  name: string;
  parentId: string | null;
}

const byName = (a: CategoryLike, b: CategoryLike) => a.name.localeCompare(b.name, 'pt-BR');

/** Raízes ordenadas por nome, cada uma seguida das filhas. Filha cujo pai não veio na lista vira raiz. */
function inTreeOrder<T extends CategoryLike>(items: readonly T[]): { item: T; depth: number }[] {
  const ids = new Set(items.map((c) => c.id));
  const roots = items.filter((c) => !c.parentId || !ids.has(c.parentId)).sort(byName);
  return roots.flatMap((root) => [
    { item: root, depth: 0 },
    ...items
      .filter((c) => c.parentId === root.id)
      .sort(byName)
      .map((child) => ({ item: child, depth: 1 })),
  ]);
}

/** Árvore para o p-treetable da tela de categorias (2 níveis, expandida). */
export function buildCategoryTree(items: readonly Category[]): TreeNode<Category>[] {
  const nodes: TreeNode<Category>[] = [];
  for (const { item, depth } of inTreeOrder(items)) {
    const node: TreeNode<Category> = { key: item.id, data: item, children: [], expanded: true };
    if (depth === 0) nodes.push(node);
    else nodes[nodes.length - 1].children?.push(node);
  }
  return nodes;
}

/** Opções de seletor em ordem de árvore, com recuo nas subcategorias e a cor da categoria. */
export function toCategoryOptions(items: readonly CategorySummary[], type?: CategoryType): LookupOption[] {
  const ofType = type ? items.filter((c) => c.type === type) : items;
  return inTreeOrder(ofType).map(({ item, depth }) => ({
    value: item.id,
    label: item.name,
    depth,
    color: item.color,
  }));
}
