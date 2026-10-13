import type { Type } from '@angular/core';
import { Injectable, inject } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { ConfirmationService } from 'primeng/api';
import { DialogService } from 'primeng/dynamicdialog';
import { Observable, map, of, tap } from 'rxjs';

import { NotifierService } from '../../ui/notifier.service';

export type ConfirmAction = 'archive' | 'delete' | 'close' | 'pay';

/** O que toda tela de cadastro repete: abrir formulário em diálogo, confirmar e executar, toast de sucesso. */
@Injectable({ providedIn: 'root' })
export class CrudActionsService {
  private readonly dialog = inject(DialogService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly transloco = inject(TranslocoService);
  private readonly notifier = inject(NotifierService);

  /** Abre o componente num diálogo. Emite true se o formulário salvou (ref.close(true)). */
  openForm<C, D>(component: Type<C>, header: string, data?: D): Observable<boolean> {
    const ref = this.dialog.open(component, {
      header: this.transloco.translate(header),
      data,
      modal: true,
      closable: true,
      focusOnShow: false,
      width: '32rem',
      breakpoints: { '640px': '95vw' },
    });
    return ref ? ref.onClose.pipe(map((saved: unknown) => saved === true)) : of(false);
  }

  /** Pergunta ("Arquivar \"Nubank\"?"), executa e mostra o toast de sucesso. Completa sem emitir se o usuário recusar. */
  confirmAndRun(action: ConfirmAction, name: string, operation: () => Observable<unknown>): Observable<void> {
    return new Observable<void>((subscriber) => {
      this.confirmation.confirm({
        header: this.transloco.translate(`common.confirm.${action}.header`),
        message: this.transloco.translate(`common.confirm.${action}.message`, { name }),
        icon: 'pi pi-exclamation-triangle',
        acceptLabel: this.transloco.translate(`common.${action}`),
        rejectLabel: this.transloco.translate('common.cancel'),
        acceptButtonProps: { severity: action === 'delete' ? 'danger' : 'primary' },
        rejectButtonProps: { severity: 'secondary', text: true },
        accept: () => this.run(operation, `common.success.${action}`).subscribe(subscriber),
        reject: () => subscriber.complete(),
      });
    });
  }

  /** Executa e mostra o toast de sucesso (sem confirmação). Erros já são tratados pelo errorInterceptor. */
  run(operation: () => Observable<unknown>, successKey: string): Observable<void> {
    return operation().pipe(
      map(() => undefined),
      tap(() => this.notifier.success(successKey)),
    );
  }
}
