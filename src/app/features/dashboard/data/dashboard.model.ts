import type { YearMonth } from '@shared/data';

export interface DashboardSummary {
  month: YearMonth;
  totalBalance: number;
  income: number;
  expenses: number;
  result: number;
}

export interface CategoryExpense {
  categoryId: string;
  name: string;
  color: string | null;
  icon: string | null;
  amount: number;
  percentage: number;
}

export interface ExpensesByCategory {
  month: YearMonth;
  total: number;
  categories: CategoryExpense[];
}
