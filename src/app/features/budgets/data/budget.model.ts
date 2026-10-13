import type { CategorySummary } from '@features/categories';
import type { LocalDate } from '@shared/data';

/** Orçamento de uma categoria no mês. spent vem pronto da API (despesas da categoria e subcategorias). */
export interface Budget {
  id: string;
  category: CategorySummary;
  month: LocalDate;
  amount: number;
  spent: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBudgetRequest {
  categoryId: string;
  month: LocalDate;
  amount: number;
}

/** Categoria e mês não mudam na edição: para outro mês ou categoria, criar um novo orçamento. */
export interface UpdateBudgetRequest {
  amount: number;
}

/** Query params de GET /budgets. month é o primeiro dia do mês. */
export interface BudgetFilter {
  month: LocalDate;
  categoryId: string;
}
