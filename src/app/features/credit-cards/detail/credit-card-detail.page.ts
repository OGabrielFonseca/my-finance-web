import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { injectCrudList } from '@shared/crud/list';
import { CrudActionsService } from '@shared/crud/page';
import type { ColumnDef, RowActionDef, RowActionEvent } from '@shared/crud/table';
import { DataTableComponent } from '@shared/crud/table';
import { Button } from 'primeng/button';

import { CreditCardApiService } from '../data/credit-card-api.service';
import type { CreditCard, Invoice } from '../data/credit-card.model';
import { PurchaseFormComponent } from '../form/purchase-form.component';

const OPEN_INVOICE_ACTION: RowActionDef<Invoice> = { id: 'open', label: 'common.open', icon: 'pi pi-arrow-right' };

@Component({
  selector: 'app-credit-card-detail-page',
  imports: [CurrencyPipe, RouterLink, TranslocoPipe, Button, DataTableComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './credit-card-detail.page.html',
})
export class CreditCardDetailPage {
  private readonly api = inject(CreditCardApiService);
  private readonly crud = inject(CrudActionsService);
  private readonly router = inject(Router);
  private readonly cardId = inject(ActivatedRoute).snapshot.paramMap.get('id') ?? '';

  protected readonly card = signal<CreditCard | null>(null);

  protected readonly columns: ColumnDef<Invoice>[] = [
    { field: 'referenceMonth', header: 'creditCards.invoices.fields.referenceMonth', type: 'month' },
    { field: 'closingDate', header: 'creditCards.invoices.fields.closingDate', type: 'date', hideOnMobile: true },
    { field: 'dueDate', header: 'creditCards.invoices.fields.dueDate', type: 'date' },
    { field: 'status', header: 'creditCards.invoices.fields.status', type: 'enum', enumKey: 'invoiceStatus' },
    { field: 'total', header: 'creditCards.invoices.fields.total', type: 'money', align: 'right' },
  ];
  protected readonly actions: RowActionDef<Invoice>[] = [OPEN_INVOICE_ACTION];

  protected readonly invoices = injectCrudList<Invoice, object>(
    { list: (_filter, page) => this.api.invoices(this.cardId, page) },
    { sort: { field: 'referenceMonth', direction: 'desc' } },
  );

  constructor() {
    this.api.get(this.cardId).subscribe({
      next: (card) => this.card.set(card),
      error: () => void this.router.navigateByUrl('/credit-cards'),
    });
  }

  protected newPurchase(): void {
    this.crud
      .openForm(PurchaseFormComponent, 'creditCards.purchase.title', { cardId: this.cardId })
      .subscribe((saved) => {
        if (saved) this.invoices.reload();
      });
  }

  protected onInvoiceAction({ id, row }: RowActionEvent<Invoice>): void {
    if (id === OPEN_INVOICE_ACTION.id) {
      void this.router.navigate(['/credit-cards', this.cardId, 'invoices', row.id]);
    }
  }
}
