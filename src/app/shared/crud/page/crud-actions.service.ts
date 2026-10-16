import type { Type } from '@angular/core';
import { Injectable, inject } from '@angular/core';
import { ConfirmationService } from 'primeng/api';
import { DialogService } from 'primeng/dynamicdialog';
import { Observable, map, of, tap } from 'rxjs';

import { NotifierService } from '../../ui/notifier.service';

export type ConfirmAction = 'archive' | 'delete' | 'close' | 'pay';

interface ConfirmTexts {
  header: string;
  message: (name: string) => string;
  accept: string;
  success: string;
}

const CONFIRM_TEXTS: Record<ConfirmAction, ConfirmTexts> = {
  archive: {
    header: 'Arquivar',
    message: (name) => `Arquivar "${name}"?`,
    accept: 'Arquivar',
    success: 'Arquivado com sucesso.',
  },
  delete: {
    header: 'Excluir',
    message: (name) => `Excluir "${name}"? Esta ação não pode ser desfeita.`,
    accept: 'Excluir',
    success: 'Excluído com sucesso.',
  },
  close: {
    header: 'Fechar fatura',
    message: (name) => `Fechar a fatura de ${name}? Depois disso não entram novas compras.`,
    accept: 'Fechar',
    success: 'Fatura fechada.',
  },
  pay: {
    header: 'Pagar fatura',
    message: (name) => `Pagar a fatura de ${name} hoje, pela conta de pagamento do cartão?`,
    accept: 'Pagar',
    success: 'Fatura paga.',
  },
};

/** O que toda tela de cadastro repete: abrir formulário em diálogo, confirmar e executar, toast de sucesso. */
@Injectable({ providedIn: 'root' })
export class CrudActionsService {
  private readonly dialog = inject(DialogService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly notifier = inject(NotifierService);

  /** Abre o componente num diálogo. Emite true se o formulário salvou (ref.close(true)). */
  openForm<C, D>(component: Type<C>, header: string, data?: D): Observable<boolean> {
    const ref = this.dialog.open(component, {
      header,
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
    const texts = CONFIRM_TEXTS[action];
    return new Observable<void>((subscriber) => {
      this.confirmation.confirm({
        header: texts.header,
        message: texts.message(name),
        icon: 'pi pi-exclamation-triangle',
        acceptLabel: texts.accept,
        rejectLabel: 'Cancelar',
        acceptButtonProps: { severity: action === 'delete' ? 'danger' : 'primary' },
        rejectButtonProps: { severity: 'secondary', text: true },
        accept: () => this.run(operation, texts.success).subscribe(subscriber),
        reject: () => subscriber.complete(),
      });
    });
  }

  /** Executa e mostra o toast de sucesso (sem confirmação). Erros já são tratados pelo errorInterceptor. */
  run(operation: () => Observable<unknown>, successMessage: string): Observable<void> {
    return operation().pipe(
      map(() => undefined),
      tap(() => this.notifier.success(successMessage)),
    );
  }
}
