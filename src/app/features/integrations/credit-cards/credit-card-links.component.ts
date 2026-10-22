import { CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ImportCountStore } from '@features/imports';
import { CrudActionsService } from '@shared/crud/page';
import { EmptyStateComponent, NotifierService } from '@shared/ui';
import { ConfirmationService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { Tag } from 'primeng/tag';

import { IntegrationApiService } from '../data/integration-api.service';
import type { CreditCardLink, LinkStatus } from '../data/integration.model';
import { CreateLinkedCreditCardDialogComponent } from './create-linked-credit-card-dialog.component';
import { LinkCreditCardDialogComponent } from './link-credit-card-dialog.component';

const STATUS_LABELS: Record<LinkStatus, string> = {
  PENDING: 'Novo cartão encontrado',
  LINKED: 'Vinculado',
  IGNORED: 'Ignorado',
  UNSUPPORTED: 'Tipo ainda não suportado',
};

/** Contas de cartão encontradas nos bancos. Vincula a um cartão existente, cria um cartão novo ou ignora. */
@Component({
  selector: 'app-credit-card-links',
  imports: [CurrencyPipe, DatePipe, RouterLink, EmptyStateComponent, Button, Card, Tag],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './credit-card-links.component.html',
})
export class CreditCardLinksComponent {
  private readonly api = inject(IntegrationApiService);
  private readonly crud = inject(CrudActionsService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly notifier = inject(NotifierService);
  private readonly count = inject(ImportCountStore);

  protected readonly loaded = signal(false);
  protected readonly links = signal<CreditCardLink[]>([]);

  constructor() {
    this.reload();
  }

  /** Chamado pela página depois de sincronizar ou de qualquer ação em outra seção. */
  reload(): void {
    this.api.creditCardLinks().subscribe((links) => {
      this.links.set(links);
      this.loaded.set(true);
    });
  }

  protected statusLabel(status: LinkStatus): string {
    return STATUS_LABELS[status];
  }

  protected statusSeverity(status: LinkStatus): 'info' | 'success' | 'secondary' {
    if (status === 'PENDING') return 'info';
    if (status === 'LINKED') return 'success';
    return 'secondary';
  }

  /** Falta dia de fechamento ou de vencimento na conta: o cadastro do cartão vai precisar deles. */
  protected missingDays(link: CreditCardLink): boolean {
    return link.closingDay == null || link.dueDay == null;
  }

  protected linkCard(link: CreditCardLink): void {
    this.crud
      .openForm(LinkCreditCardDialogComponent, 'Vincular cartão', { link })
      .subscribe((saved) => saved && this.changed());
  }

  protected createCard(link: CreditCardLink): void {
    this.crud
      .openForm(CreateLinkedCreditCardDialogComponent, 'Criar cartão', { link })
      .subscribe((saved) => saved && this.changed());
  }

  protected ignore(link: CreditCardLink): void {
    this.api.ignoreCreditCard(link.id).subscribe(() => {
      this.notifier.success('Cartão ignorado');
      this.changed();
    });
  }

  protected unlink(link: CreditCardLink): void {
    this.confirmation.confirm({
      header: 'Desvincular',
      message: `Desvincular "${link.externalName}"? As compras já importadas continuam no cartão e na fila, sem aprovação.`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Desvincular',
      rejectLabel: 'Cancelar',
      rejectButtonProps: { severity: 'secondary', text: true },
      accept: () =>
        this.api.unlinkCreditCard(link.id).subscribe(() => {
          this.notifier.success('Cartão desvinculado');
          this.changed();
        }),
    });
  }

  private changed(): void {
    this.reload();
    this.count.refresh();
  }
}
