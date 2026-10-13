import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { Button } from 'primeng/button';

import { AssetApiService } from '../data/asset-api.service';
import type { AssetPosition } from '../data/investment.model';

/** Posição derivada das operações, a preço de custo (a API calcula preço médio e custo total). */
@Component({
  selector: 'app-asset-position',
  imports: [CurrencyPipe, DecimalPipe, TranslocoPipe, Button],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (position(); as p) {
      <dl class="m-0 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
        <div>
          <dt class="text-muted-color">{{ 'investments.positions.fields.quantity' | transloco }}</dt>
          <dd class="m-0 tabular-nums">{{ p.quantity | number: '1.0-8' }}</dd>
        </div>
        <div>
          <dt class="text-muted-color">{{ 'investments.positions.fields.averagePrice' | transloco }}</dt>
          <dd class="m-0 tabular-nums">{{ p.averagePrice | currency }}</dd>
        </div>
        <div>
          <dt class="text-muted-color">{{ 'investments.positions.fields.totalCost' | transloco }}</dt>
          <dd class="m-0 font-semibold tabular-nums">{{ p.totalCost | currency }}</dd>
        </div>
      </dl>
    }
    <div class="mt-4 flex justify-end">
      <p-button severity="secondary" [label]="'common.close' | transloco" (onClick)="ref.close()" />
    </div>
  `,
})
export class AssetPositionComponent {
  private readonly api = inject(AssetApiService);
  protected readonly ref = inject(DynamicDialogRef);
  private readonly id = (inject(DynamicDialogConfig).data as { id: string }).id;

  protected readonly position = signal<AssetPosition | null>(null);

  constructor() {
    this.api.position(this.id).subscribe((position) => this.position.set(position));
  }
}
