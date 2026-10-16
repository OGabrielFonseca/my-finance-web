import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

/** Links entre as áreas de investimentos (carteira, ativos, operações e proventos). */
@Component({
  selector: 'app-investments-nav',
  imports: [RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav class="flex flex-wrap gap-2" [attr.aria-label]="'Áreas de investimentos'">
      @for (item of items; track item.route) {
        <a
          [routerLink]="item.route"
          routerLinkActive="border-primary font-semibold"
          [routerLinkActiveOptions]="{ exact: true }"
          class="rounded-border border border-surface px-3 py-1 text-sm"
          >{{ item.label }}</a
        >
      }
    </nav>
  `,
})
export class InvestmentsNavComponent {
  protected readonly items = [
    { label: 'Carteira', route: '/investments' },
    { label: 'Ativos', route: '/investments/assets' },
    { label: 'Operações', route: '/investments/operations' },
    { label: 'Proventos', route: '/investments/incomes' },
  ] as const;
}
