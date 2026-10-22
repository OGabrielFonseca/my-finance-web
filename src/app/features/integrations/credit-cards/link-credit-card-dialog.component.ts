import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CreditCardApiService, type CreditCardSummary } from '@features/credit-cards';
import { MAX_PAGE_SIZE, toLocalDate } from '@shared/data';
import { FieldComponent, FormFooterComponent, injectFormSubmit } from '@shared/forms';
import { NotifierService } from '@shared/ui';
import { DatePicker } from 'primeng/datepicker';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { Select } from 'primeng/select';

import { IntegrationApiService } from '../data/integration-api.service';
import { importFromRange } from '../data/import-from';
import type { CreditCardLink } from '../data/integration.model';

/** Vincula a conta de cartão da Pluggy a um cartão existente do MyFinance, a partir de uma data de corte. */
@Component({
  selector: 'app-link-credit-card-dialog',
  imports: [ReactiveFormsModule, FieldComponent, FormFooterComponent, DatePicker, Select],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './link-credit-card-dialog.component.html',
})
export class LinkCreditCardDialogComponent {
  private readonly api = inject(IntegrationApiService);
  private readonly cards = inject(CreditCardApiService);
  private readonly notifier = inject(NotifierService);
  protected readonly ref = inject(DynamicDialogRef);
  protected readonly link = (inject(DynamicDialogConfig).data as { link: CreditCardLink }).link;

  private readonly activeCards = signal<CreditCardSummary[]>([]);
  protected readonly cardOptions = computed(() =>
    this.activeCards().map((card) => ({ value: card.id, label: card.name })),
  );
  protected readonly range = importFromRange(new Date());

  protected readonly form = inject(NonNullableFormBuilder).group({
    creditCardId: ['', Validators.required],
    importFrom: [new Date(), Validators.required],
  });

  protected readonly submit = injectFormSubmit(
    this.form,
    (value, context) =>
      this.api.linkCreditCard(
        this.link.id,
        { creditCardId: value.creditCardId, importFrom: toLocalDate(value.importFrom) },
        context,
      ),
    (linked) => {
      this.notifier.success(linked.creditCard ? `Cartão vinculado · ${linked.creditCard.name}` : 'Cartão vinculado');
      this.ref.close(true);
    },
  );

  constructor() {
    // Só cartões ativos: o backend recusa arquivados. Os já vinculados a outra conta o backend recusa ao salvar.
    this.cards
      .options({ archived: false }, { page: 0, size: MAX_PAGE_SIZE })
      .subscribe((page) => this.activeCards.set(page.items));
  }
}
