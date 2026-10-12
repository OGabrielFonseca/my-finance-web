export const CATEGORY_TYPES = ['EXPENSE', 'INCOME'] as const;
export type CategoryType = (typeof CATEGORY_TYPES)[number];

export interface Category {
  id: string;
  parentId: string | null;
  name: string;
  type: CategoryType;
  color: string | null;
  icon: string | null;
  archived: boolean;
  system: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CategorySummary {
  id: string;
  name: string;
  type: CategoryType;
  color: string | null;
  icon: string | null;
  parentId: string | null;
}

export interface CreateCategoryRequest {
  name: string;
  type?: CategoryType;
  parentId?: string;
  color?: string;
  icon?: string;
}

export interface UpdateCategoryRequest {
  name: string;
  color?: string;
  icon?: string;
}

/** Query params de GET /categories e /categories/options. */
export interface CategoryFilter {
  name: string;
  type: CategoryType;
  archived: boolean;
}

/** Paleta oferecida no formulário (a cor é dado do usuário, guardada em hexadecimal na API). */
export const CATEGORY_COLORS = [
  '#16a34a',
  '#0d9488',
  '#65a30d',
  '#ca8a04',
  '#ea580c',
  '#dc2626',
  '#db2777',
  '#9333ea',
  '#7c3aed',
  '#2563eb',
  '#0891b2',
  '#64748b',
] as const;

/** Ícones do PrimeIcons oferecidos no formulário (o campo icon guarda a classe). */
export const CATEGORY_ICONS = [
  'pi pi-home',
  'pi pi-building',
  'pi pi-shopping-cart',
  'pi pi-shopping-bag',
  'pi pi-shop',
  'pi pi-car',
  'pi pi-bolt',
  'pi pi-heart',
  'pi pi-ticket',
  'pi pi-video',
  'pi pi-book',
  'pi pi-briefcase',
  'pi pi-desktop',
  'pi pi-mobile',
  'pi pi-chart-line',
  'pi pi-wallet',
  'pi pi-gift',
  'pi pi-globe',
  'pi pi-users',
  'pi pi-tag',
] as const;
