import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DOCUMENT, computed, inject, input } from '@angular/core';
import type { EChartsCoreOption } from 'echarts/core';
import { NgxEchartsDirective } from 'ngx-echarts';

/**
 * Wrapper do ngx-echarts: aplica cores do tema (variáveis CSS do PrimeNG) e moeda pt-BR no tooltip.
 * A página informa o modo escuro (ThemeService.isDark) para o gráfico recalcular as cores.
 * O contêiner precisa de altura definida (input height).
 */
@Component({
  selector: 'app-chart',
  imports: [NgxEchartsDirective],
  providers: [CurrencyPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div
    echarts
    class="block w-full"
    [options]="themedOptions()"
    [autoResize]="true"
    [style.height]="height()"
  ></div>`,
})
export class ChartComponent {
  readonly options = input.required<EChartsCoreOption>();
  readonly dark = input(false);
  readonly height = input('18rem');

  private readonly document = inject(DOCUMENT);
  private readonly currency = inject(CurrencyPipe);

  protected readonly themedOptions = computed<EChartsCoreOption>(() => {
    this.dark(); // as variáveis CSS mudam com o tema
    const css = getComputedStyle(this.document.documentElement);
    const color = (name: string) => css.getPropertyValue(name).trim();
    const options = this.options();
    return {
      ...options,
      textStyle: { color: color('--p-text-color'), fontFamily: 'inherit' },
      tooltip: {
        backgroundColor: color('--p-content-background'),
        borderColor: color('--p-content-border-color'),
        textStyle: { color: color('--p-text-color') },
        valueFormatter: (value: unknown) => this.currency.transform(Number(value)) ?? '',
        ...(options['tooltip'] as object | undefined),
      },
    };
  });
}
