import type { Category, CategoryType } from '../mock-types';
import { seedId, seedInstant } from './seed-ids';

export const CATEGORY_IDS = {
  salary: seedId('c', 1),
  freelance: seedId('c', 2),
  yields: seedId('c', 3),
  housing: seedId('c', 10),
  rent: seedId('c', 11),
  condo: seedId('c', 12),
  energy: seedId('c', 13),
  food: seedId('c', 20),
  groceries: seedId('c', 21),
  restaurants: seedId('c', 22),
  transport: seedId('c', 30),
  fuel: seedId('c', 31),
  rides: seedId('c', 32),
  health: seedId('c', 40),
  pharmacy: seedId('c', 41),
  leisure: seedId('c', 50),
  streaming: seedId('c', 51),
  education: seedId('c', 60),
  invoicePayment: seedId('c', 90),
} as const;

export function seedCategories(): Category[] {
  const at = seedInstant('2026-01-02');
  const category = (
    id: string,
    name: string,
    type: CategoryType,
    color: string,
    icon: string,
    extra: Partial<Category> = {},
  ): Category => ({
    id,
    name,
    type,
    color,
    icon,
    parentId: null,
    archived: false,
    system: false,
    createdAt: at,
    updatedAt: at,
    ...extra,
  });
  const child = (id: string, name: string, parent: Category, icon = parent.icon ?? 'pi pi-tag') =>
    category(id, name, parent.type, parent.color ?? '#64748b', icon, { parentId: parent.id });

  const housing = category(CATEGORY_IDS.housing, 'Moradia', 'EXPENSE', '#7c3aed', 'pi pi-home');
  const food = category(CATEGORY_IDS.food, 'Alimentação', 'EXPENSE', '#ea580c', 'pi pi-shopping-cart');
  const transport = category(CATEGORY_IDS.transport, 'Transporte', 'EXPENSE', '#2563eb', 'pi pi-car');
  const health = category(CATEGORY_IDS.health, 'Saúde', 'EXPENSE', '#dc2626', 'pi pi-heart');
  const leisure = category(CATEGORY_IDS.leisure, 'Lazer', 'EXPENSE', '#db2777', 'pi pi-ticket');

  return [
    category(CATEGORY_IDS.salary, 'Salário', 'INCOME', '#16a34a', 'pi pi-briefcase'),
    category(CATEGORY_IDS.freelance, 'Freelance', 'INCOME', '#0d9488', 'pi pi-desktop'),
    category(CATEGORY_IDS.yields, 'Rendimentos', 'INCOME', '#65a30d', 'pi pi-chart-line'),
    housing,
    child(CATEGORY_IDS.rent, 'Aluguel', housing, 'pi pi-building'),
    child(CATEGORY_IDS.condo, 'Condomínio', housing),
    child(CATEGORY_IDS.energy, 'Energia', housing, 'pi pi-bolt'),
    food,
    child(CATEGORY_IDS.groceries, 'Mercado', food),
    child(CATEGORY_IDS.restaurants, 'Restaurantes', food, 'pi pi-shop'),
    transport,
    child(CATEGORY_IDS.fuel, 'Combustível', transport),
    child(CATEGORY_IDS.rides, 'Aplicativos', transport, 'pi pi-mobile'),
    health,
    child(CATEGORY_IDS.pharmacy, 'Farmácia', health),
    leisure,
    child(CATEGORY_IDS.streaming, 'Streaming', leisure, 'pi pi-video'),
    category(CATEGORY_IDS.education, 'Educação', 'EXPENSE', '#0891b2', 'pi pi-book', { archived: true }),
    category(CATEGORY_IDS.invoicePayment, 'Pagamento de fatura', 'EXPENSE', '#64748b', 'pi pi-credit-card', {
      system: true,
    }),
  ];
}
