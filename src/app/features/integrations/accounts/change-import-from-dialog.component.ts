import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { fromLocalDate, toLocalDate } from '@shared/data';
import { FieldComponent, FormFooterComponent, injectFormSubmit } from '@shared/forms';
import { NotifierService } from '@shared/ui';
import { DatePicker } from 'primeng/datepicker';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import type { Observable } from 'rxjs';
import { of } from 'rxjs';

import { IntegrationApiService } from '../data/integration-api.service';
import { importFromChange, importFromRange } from '../data/import-from';
import type { BankAccountLink } from '../data/integration.model';

/**
 * Altera a data de corte de uma conta vinculada. Mais recente ignora pendentes antigos; mais antiga faz busca retroativa.
 * Data igual fecha sem chamar a API.
 */
@Component({
  selector: 'app-change-import-from-dialog',
  imports: [DatePipe, ReactiveFormsModule, FieldComponent, FormFooterComponent, DatePicker],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './change-import-from-dialog.component.html',
})
export class ChangeImportFromDialogComponent {
  private readonly api = inject(IntegrationApiService);
  private readonly notifier = inject(NotifierService);
  protected readonly ref = inject(DynamicDialogRef);
  private readonly link = (inject(DynamicDialogConfig).data as { link: BankAccountLink }).link;

  /** Data gravada hoje, no formato da API. */
  private readonly current = this.link.importFrom ?? toLocalDate(new Date());
  protected readonly range = importFromRange(new Date());

  protected readonly form = inject(NonNullableFormBuilder).group({
    importFrom: [fromLocalDate(this.current), Validators.required],
  });

  protected readonly next = toSignal(this.form.controls.importFrom.valueChanges, {
    initialValue: this.form.controls.importFrom.value,
  });

  protected readonly change = computed(() => importFromChange(this.current, toLocalDate(this.next())));

  protected readonly submit = injectFormSubmit(
    this.form,
    (value, context): Observable<BankAccountLink | null> => {
      const importFrom = toLocalDate(value.importFrom);
      if (importFromChange(this.current, importFrom) === 'same') return of(null);
      return this.api.changeImportFrom(this.link.id, { importFrom }, context);
    },
    (updated) => {
      if (!updated) {
        this.ref.close(false);
        return;
      }
      const items = updated.pendingItems;
      this.notifier.success(`Data alterada · ${items} ${items === 1 ? 'item' : 'itens'} na fila`);
      this.ref.close(true);
    },
  );
}
