import type { ApiResponse } from '@api/api-types';
import type { YearMonth } from '@shared/data/dates';

// month é YearMonth no backend ('2026-10'); o tipo é fixado aqui caso o OpenAPI o descreva de outro jeito.
export type DashboardSummary = Omit<ApiResponse<'DashboardSummaryResponse'>, 'month'> & { month: YearMonth };
export type CategoryExpense = ApiResponse<'CategoryExpense', 'color' | 'icon'>;
export type ExpensesByCategory = Omit<ApiResponse<'ExpensesByCategoryResponse'>, 'month' | 'categories'> & {
  month: YearMonth;
  categories: CategoryExpense[];
};
