import type { AccountSummary } from '@features/accounts';
import type { LocalDate } from '@shared/data';

export const INVOICE_STATUSES = ['OPEN', 'CLOSED', 'PAID'] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export interface CreditCard {
  id: string;
  paymentAccount: AccountSummary;
  name: string;
  brand: string | null;
  creditLimit: number;
  closingDay: number;
  dueDay: number;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreditCardSummary {
  id: string;
  name: string;
  brand: string | null;
}

/** Corpo de criação e de edição (o contrato é o mesmo no backend). */
export interface CreditCardRequest {
  name: string;
  brand?: string;
  creditLimit: number;
  closingDay: number;
  dueDay: number;
  paymentAccountId: string;
}

/** Query params de GET /creditCards. */
export interface CreditCardFilter {
  name: string;
  archived: boolean;
}

export interface Invoice {
  id: string;
  creditCard: CreditCardSummary;
  referenceMonth: LocalDate;
  closingDate: LocalDate;
  dueDate: LocalDate;
  status: InvoiceStatus;
  total: number;
  paymentTransactionId: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Compra no cartião: amount é o total; installments omitido = à vista. */
export interface PurchaseRequest {
  description: string;
  amount: number;
  date: LocalDate;
  categoryId: string;
  installments?: number;
  notes?: string;
}

/** Tudo opcional: sem accountId, usa a conta de pagamento do cartão; sem date, usa hoje. */
export interface PayInvoiceRequest {
  accountId?: string;
  date?: LocalDate;
}
