import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';

/** Links entre as áreas de investimentos (carteira, ativos, operações e proventos). */
@Component({
  selector: 'app-investments-nav',
  imports: [RouterLink, RouterLinkActive, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav class="flex flex-wrap gap-2" [attr.aria-label]="'investments.nav.label' | transloco">
      @for (item of items; track item.route) {
        <a
          [routerLink]="item.route"
          routerLinkActive="border-primary font-semibold"
          [routerLinkActiveOptions]="{ exact: true }"
          class="rounded-border border border-surface px-3 py-1 text-sm"
          >{{ item.label | transloco }}</a
        >
      }
    </nav>
  `,
})
export class InvestmentsNavComponent {
  protected readonly items = [
    { label: 'investments.nav.portfolio', route: '/investments' },
    { label: 'investments.nav.assets', route: '/investments/assets' },
    { label: 'investments.nav.operations', route: '/investments/operations' },
    { label: 'investments.nav.incomes', route: '/investments/incomes' },
  ] as const;
}
