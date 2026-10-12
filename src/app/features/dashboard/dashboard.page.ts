import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ThemeService } from '@core/theme/theme.service';
import { TranslocoPipe } from '@jsverse/transloco';
import { toLocalDate, toYearMonth } from '@shared/data';
import { ChartComponent } from '@shared/ui';
import { EmptyStateComponent } from '@shared/ui';
import { StatCardComponent } from '@shared/ui';
import type { EChartsCoreOption } from 'echarts/core';
import { Button } from 'primeng/button';
import { DatePicker } from 'primeng/datepicker';
import { Skeleton } from 'primeng/skeleton';
import { finalize, forkJoin } from 'rxjs';

import { DashboardApiService } from './data/dashboard-api.service';
import type { DashboardSummary, ExpensesByCategory } from './data/dashboard.model';

const firstOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);

@Component({
  selector: 'app-dashboard-page',
  imports: [
    CurrencyPipe,
    DecimalPipe,
    FormsModule,
    RouterLink,
    TranslocoPipe,
    ChartComponent,
    EmptyStateComponent,
    StatCardComponent,
    Button,
    DatePicker,
    Skeleton,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard.page.html',
})
export class DashboardPage {
  private readonly api = inject(DashboardApiService);
  protected readonly theme = inject(ThemeService);

  protected readonly month = signal(firstOfMonth(new Date()));
  protected readonly summary = signal<DashboardSummary | null>(null);
  protected readonly expenses = signal<ExpensesByCategory | null>(null);
  protected readonly loading = signal(false);

  /** Link para o extrato filtrado pelo mês exibido. */
  protected readonly monthFilter = computed(() => {
    const month = this.month();
    return {
      from: toLocalDate(month),
      to: toLocalDate(new Date(month.getFullYear(), month.getMonth() + 1, 0)),
    };
  });

  protected readonly chartOptions = computed<EChartsCoreOption>(() => ({
    tooltip: { trigger: 'item' },
    series: [
      {
        type: 'pie',
        radius: ['55%', '80%'],
        label: { show: false },
        data: (this.expenses()?.categories ?? []).map((c) => ({
          name: c.name,
          value: c.amount,
          itemStyle: c.color ? { color: c.color } : undefined,
        })),
      },
    ],
  }));

  constructor() {
    effect((onCleanup) => {
      const month = toYearMonth(this.month());
      this.loading.set(true);
      const subscription = forkJoin({
        summary: this.api.summary(month),
        expenses: this.api.expensesByCategory(month),
      })
        .pipe(finalize(() => this.loading.set(false)))
        .subscribe(({ summary, expenses }) => {
          this.summary.set(summary);
          this.expenses.set(expenses);
        });
      onCleanup(() => subscription.unsubscribe());
    });
  }

  protected shiftMonth(delta: number): void {
    this.month.update((date) => new Date(date.getFullYear(), date.getMonth() + delta, 1));
  }

  protected selectMonth(date: Date | null): void {
    if (date) this.month.set(firstOfMonth(date));
  }
}
