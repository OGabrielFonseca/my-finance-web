import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';

import type { MoneyKind } from './money.component';
import { MoneyComponent } from './money.component';

/** Card de indicador do dashboard: rótulo + valor em BRL. */
@Component({
  selector: 'app-stat-card',
  imports: [TranslocoPipe, MoneyComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col gap-2 rounded-border border border-surface bg-surface-0 p-4 dark:bg-surface-900">
      <span class="flex items-center gap-2 text-sm text-muted-color">
        <i [class]="icon()"></i>
        {{ label() | transloco }}
      </span>
      <span class="text-2xl font-semibold">
        <app-money [amount]="value()" [kind]="kind()" />
      </span>
    </div>
  `,
})
export class StatCardComponent {
  readonly label = input.required<string>(); // chave i18n
  readonly value = input.required<number>();
  readonly icon = input('pi pi-wallet');
  readonly kind = input<MoneyKind | null>(null);
}
