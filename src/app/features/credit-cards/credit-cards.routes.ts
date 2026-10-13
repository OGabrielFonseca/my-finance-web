import type { Routes } from '@angular/router';
import { provideTranslocoScope } from '@jsverse/transloco';

import { CreditCardDetailPage } from './detail/credit-card-detail.page';
import { InvoiceDetailPage } from './invoice/invoice-detail.page';
import { CreditCardListPage } from './list/credit-card-list.page';

export default [
  { path: '', component: CreditCardListPage, providers: [provideTranslocoScope('credit-cards')] },
  { path: ':id', component: CreditCardDetailPage, providers: [provideTranslocoScope('credit-cards')] },
  {
    path: ':id/invoices/:invoiceId',
    component: InvoiceDetailPage,
    providers: [provideTranslocoScope('credit-cards')],
  },
] satisfies Routes;
