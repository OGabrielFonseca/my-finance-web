import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type MoneyKind = 'INCOME' | 'EXPENSE' | 'TRANSFER';

/** Valor em BRL. Com kind, mostra sinal e cor (receita +verde, despesa −vermelho, transferência azul). */
@Component({
  selector: 'app-money',
  imports: [CurrencyPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="whitespace-nowrap tabular-nums" [style.color]="color()"
    >{{ sign() }}{{ amount() | currency }}</span
  >`,
})
export class MoneyComponent {
  readonly amount = input.required<number>();
  readonly kind = input<MoneyKind | null>(null);

  protected readonly sign = computed(() => (this.kind() === 'INCOME' ? '+' : this.kind() === 'EXPENSE' ? '−' : ''));
  protected readonly color = computed(() => {
    const kind = this.kind();
    return kind ? `var(--app-${kind.toLowerCase()})` : null;
  });
}
