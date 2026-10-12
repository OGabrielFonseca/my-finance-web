import { Injectable, inject } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { MessageService } from 'primeng/api';

/** Toasts padronizados. Sucesso recebe chave i18n; erro recebe o texto já pronto (normalmente o detail da API). */
@Injectable({ providedIn: 'root' })
export class NotifierService {
  private readonly messages = inject(MessageService);
  private readonly transloco = inject(TranslocoService);

  success(key: string, params?: Record<string, unknown>): void {
    this.messages.add({ severity: 'success', summary: this.transloco.translate(key, params), life: 3000 });
  }

  error(detail: string): void {
    this.messages.add({ severity: 'error', summary: this.transloco.translate('errors.title'), detail, life: 6000 });
  }

  errorKey(key: string): void {
    this.error(this.transloco.translate(key));
  }
}
