import { CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ImportCountStore } from '@features/imports';
import { CrudActionsService } from '@shared/crud/page';
import { EmptyStateComponent, NotifierService } from '@shared/ui';
import { ConfirmationService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { Tag } from 'primeng/tag';

import { IntegrationApiService } from '../data/integration-api.service';
import type { BankAccountLink, LinkStatus } from '../data/integration.model';
import { ChangeImportFromDialogComponent } from './change-import-from-dialog.component';
import { CreateAccountDialogComponent } from './create-account-dialog.component';
import { LinkAccountDialogComponent } from './link-account-dialog.component';

interface ConnectionGroup {
  connectionId: string;
  name: string;
  links: BankAccountLink[];
}

const STATUS_LABELS: Record<LinkStatus, string> = {
  PENDING: 'Nova conta encontrada',
  LINKED: 'Vinculada',
  IGNORED: 'Ignorada',
  UNSUPPORTED: 'Tipo ainda não suportado',
};

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

/**
 * Contas encontradas nos bancos, agrupadas por banco. Cada conta é vinculada, criada, ignorada ou desvinculada aqui; o
 * pai chama reload() depois de sincronizar.
 */
@Component({
  selector: 'app-bank-accounts',
  imports: [CurrencyPipe, DatePipe, RouterLink, EmptyStateComponent, Button, Card, Tag],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './bank-accounts.component.html',
})
export class BankAccountsComponent {
  private readonly api = inject(IntegrationApiService);
  private readonly crud = inject(CrudActionsService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly notifier = inject(NotifierService);
  private readonly count = inject(ImportCountStore);

  protected readonly loaded = signal(false);
  protected readonly accounts = signal<BankAccountLink[]>([]);

  protected readonly groups = computed<ConnectionGroup[]>(() => {
    const byConnection = new Map<string, ConnectionGroup>();
    for (const link of this.accounts()) {
      const group = byConnection.get(link.connection.id) ?? {
        connectionId: link.connection.id,
        name: link.connection.name ?? 'Banco sem nome',
        links: [],
      };
      group.links.push(link);
      byConnection.set(link.connection.id, group);
    }
    return [...byConnection.values()];
  });

  constructor() {
    this.reload();
  }

  reload(): void {
    this.api.accounts().subscribe((accounts) => {
      this.accounts.set(accounts);
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

  /** Banco menos MyFinance; null quando falta um dos saldos. Arredondado em centavos. */
  protected difference(link: BankAccountLink): number | null {
    if (link.bankBalance == null || link.myFinanceBalance == null) return null;
    return Math.round((link.bankBalance - link.myFinanceBalance) * 100) / 100;
  }

  protected linkAccount(link: BankAccountLink): void {
    this.crud
      .openForm(LinkAccountDialogComponent, 'Vincular conta', { link })
      .subscribe((saved) => saved && this.changed());
  }

  protected createAccount(link: BankAccountLink): void {
    this.crud
      .openForm(CreateAccountDialogComponent, 'Criar conta', { link })
      .subscribe((saved) => saved && this.changed());
  }

  protected changeImportFrom(link: BankAccountLink): void {
    this.crud
      .openForm(ChangeImportFromDialogComponent, 'Alterar data de corte', { link })
      .subscribe((saved) => saved && this.changed());
  }

  protected ignore(link: BankAccountLink): void {
    this.api.ignoreAccount(link.id).subscribe(() => {
      this.notifier.success('Conta ignorada');
      this.changed();
    });
  }

  protected unlink(link: BankAccountLink): void {
    this.confirmation.confirm({
      header: 'Desvincular',
      message: `Desvincular "${link.externalName}"? Os itens pendentes continuam na fila, mas não podem ser aprovados até um novo vínculo.`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Desvincular',
      rejectLabel: 'Cancelar',
      rejectButtonProps: { severity: 'secondary', text: true },
      accept: () =>
        this.api.unlinkAccount(link.id).subscribe(() => {
          this.notifier.success('Conta desvinculada');
          this.changed();
        }),
    });
  }

  protected adjustBalance(link: BankAccountLink): void {
    const diff = this.difference(link);
    if (!diff) return;

    const kind = diff > 0 ? 'receita' : 'despesa';
    const pending = link.pendingItems > 0 ? ' Aprove a fila antes; a diferença pode ser só isso.' : '';
    this.confirmation.confirm({
      header: 'Ajustar saldo',
      message: `Criar um lançamento de ${money.format(Math.abs(diff))} (${kind}) em "Ajuste de saldo" para o saldo ficar igual ao do banco?${pending}`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Ajustar',
      rejectLabel: 'Cancelar',
      rejectButtonProps: { severity: 'secondary', text: true },
      accept: () =>
        this.api.adjustBalance(link.id).subscribe(() => {
          this.notifier.success('Saldo ajustado');
          this.changed();
        }),
    });
  }

  private changed(): void {
    this.reload();
    this.count.refresh();
  }
}
