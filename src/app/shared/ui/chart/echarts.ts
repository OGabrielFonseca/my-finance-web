import type { Provider } from '@angular/core';
import { PieChart } from 'echarts/charts';
import { TooltipComponent } from 'echarts/components';
import * as echarts from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { provideEchartsCore } from 'ngx-echarts';

// Import modular: registre aqui só os gráficos e componentes usados (BarChart, LineChart... quando chegarem).
echarts.use([PieChart, TooltipComponent, CanvasRenderer]);

/** Registre nas rotas que usam <app-chart>, para o ECharts ficar fora do bundle inicial. */
export function provideCharts(): Provider {
  return provideEchartsCore({ echarts });
}
