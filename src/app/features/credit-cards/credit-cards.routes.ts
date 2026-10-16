import type { Routes } from '@angular/router';

import { CreditCardDetailPage } from './detail/credit-card-detail.page';
import { InvoiceDetailPage } from './invoice/invoice-detail.page';
import { CreditCardListPage } from './list/credit-card-list.page';

export default [
  {
    path: '',
    component: CreditCardListPage,
  },
  {
    path: ':id',
    component: CreditCardDetailPage,
  },
  {
    path: ':id/invoices/:invoiceId',
    component: InvoiceDetailPage,
  },
] satisfies Routes;
