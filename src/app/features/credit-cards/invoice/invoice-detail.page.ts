import { CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { TransactionApiService } from '@features/transactions';
import type { Transaction } from '@features/transactions';
import { injectCrudList } from '@shared/crud/list';
import { CrudActionsService } from '@shared/crud/page';
import type { ColumnDef, RowActionDef, RowActionEvent } from '@shared/crud/table';
import { CellDirective, DELETE_ACTION, DataTableComponent } from '@shared/crud/table';
import { Button } from 'primeng/button';

import { CreditCardApiService } from '../data/credit-card-api.service';
import type { Invoice } from '../data/credit-card.model';

/** Lançamentos de uma fatura. Só se exclui compra com a fatura aberta. */
@Component({
  selector: 'app-invoice-detail-page',
  imports: [CellDirective, CurrencyPipe, DatePipe, RouterLink, TranslocoPipe, Button, DataTableComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './invoice-detail.page.html',
})
export class InvoiceDetailPage {
  private readonly api = inject(CreditCardApiService);
  private readonly transactions = inject(TransactionApiService);
  private readonly crud = inject(CrudActionsService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  protected readonly cardId = this.route.snapshot.paramMap.get('id') ?? '';
  private readonly invoiceId = this.route.snapshot.paramMap.get('invoiceId') ?? '';

  protected readonly invoice = signal<Invoice | null>(null);

  protected readonly columns: ColumnDef<Transaction>[] = [
    { field: 'date', sortField: 'transactionDate', header: 'creditCards.invoice.fields.date', type: 'date' },
    { field: 'description', header: 'creditCards.invoice.fields.description' },
    {
      field: 'installmentNumber',
      key: 'installment',
      header: 'creditCards.invoice.fields.installment',
      sortField: false,
      align: 'center',
      hideOnMobile: true,
    },
    { field: 'amount', header: 'creditCards.invoice.fields.amount', type: 'money', align: 'right' },
  ];

  protected readonly rowActions = computed<RowActionDef<Transaction>[]>(() =>
    this.invoice()?.status === 'OPEN' ? [DELETE_ACTION] : [],
  );

  protected readonly items = injectCrudList<Transaction, object>(
    {
      list: (_filter, page) => this.transactions.list({ creditCardInvoiceId: this.invoiceId }, page),
    },
    { size: 50, sort: { field: 'transactionDate', direction: 'asc' } },
  );

  constructor() {
    this.loadInvoice();
  }

  protected close(): void {
    const invoice = this.invoice();
    if (!invoice) return;
    this.crud
      .confirmAndRun('close', invoice.creditCard.name, () => this.api.close(this.cardId, this.invoiceId))
      .subscribe(() => this.refresh());
  }

  protected pay(): void {
    const invoice = this.invoice();
    if (!invoice) return;
    this.crud
      .confirmAndRun('pay', invoice.creditCard.name, () => this.api.pay(this.cardId, this.invoiceId))
      .subscribe(() => this.refresh());
  }

  protected onAction({ id, row }: RowActionEvent<Transaction>): void {
    if (id !== DELETE_ACTION.id) return;
    this.crud
      .confirmAndRun('delete', row.description, () => this.api.deletePurchase(this.cardId, row.id))
      .subscribe(() => this.refresh());
  }

  private refresh(): void {
    this.loadInvoice();
    this.items.reload();
  }

  private loadInvoice(): void {
    this.api.invoice(this.cardId, this.invoiceId).subscribe({
      next: (invoice) => this.invoice.set(invoice),
      error: () => void this.router.navigate(['/credit-cards', this.cardId]),
    });
  }
}
