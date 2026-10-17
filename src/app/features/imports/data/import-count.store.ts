import { Injectable, inject, signal } from '@angular/core';

import { ImportApiService } from './import-api.service';

/**
 * Quantos itens estão pendentes na fila, para o contador do menu. A tela chama refresh() ao entrar no shell, ao navegar
 * para importações ou integrações, e depois de aprovar, ignorar ou sincronizar. Erro mantém o valor anterior.
 */
@Injectable({ providedIn: 'root' })
export class ImportCountStore {
  private readonly api = inject(ImportApiService);
  private readonly pendingState = signal(0);

  readonly pending = this.pendingState.asReadonly();

  refresh(): void {
    this.api.count().subscribe({
      next: (count) => this.pendingState.set(count.pending),
      error: () => {
        // O errorInterceptor já avisou; o contador continua com o último valor conhecido.
      },
    });
  }
}
