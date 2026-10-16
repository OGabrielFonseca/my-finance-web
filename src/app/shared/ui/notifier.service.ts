import { Injectable, inject } from '@angular/core';
import { MessageService } from 'primeng/api';

/** Toasts padronizados. As mensagens já chegam em português. */
@Injectable({ providedIn: 'root' })
export class NotifierService {
  private readonly messages = inject(MessageService);

  success(message: string): void {
    this.messages.add({ severity: 'success', summary: message, life: 3000 });
  }

  error(detail: string): void {
    this.messages.add({ severity: 'error', summary: 'Erro', detail, life: 6000 });
  }
}
