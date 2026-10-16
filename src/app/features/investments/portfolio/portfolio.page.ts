import { EnumLabelPipe } from '@shared/i18n/enum-labels';
import { enumLabel } from '@shared/i18n/enum-labels';
import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ThemeService } from '@core/theme/theme.service';
import { ChartComponent } from '@shared/ui/chart';
import { StatCardComponent } from '@shared/ui';
import type { EChartsCoreOption } from 'echarts/core';
import { Skeleton } from 'primeng/skeleton';

import { InvestmentsNavComponent } from '../nav/investments-nav.component';
import { PortfolioApiService } from '../data/portfolio-api.service';
import type { Portfolio } from '../data/investment.model';

@Component({
  selector: 'app-portfolio-page',
  imports: [
    EnumLabelPipe,
    CurrencyPipe,
    DecimalPipe,
    ChartComponent,
    InvestmentsNavComponent,
    Skeleton,
    StatCardComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './portfolio.page.html',
})
export class PortfolioPage {
  private readonly api = inject(PortfolioApiService);
  protected readonly theme = inject(ThemeService);

  protected readonly portfolio = signal<Portfolio | null>(null);

  /** Rosca da distribuição por classe. Os valores e percentuais vêm prontos da API. */
  protected readonly chartOptions = computed<EChartsCoreOption>(() => ({
    tooltip: { trigger: 'item' },
    series: [
      {
        type: 'pie',
        radius: ['55%', '80%'],
        label: { show: false },
        data: (this.portfolio()?.allocation ?? []).map((a) => ({
          name: enumLabel('assetClass', a.assetClass),
          value: a.totalCost,
        })),
      },
    ],
  }));

  constructor() {
    this.api.get().subscribe((portfolio) => this.portfolio.set(portfolio));
  }
}
