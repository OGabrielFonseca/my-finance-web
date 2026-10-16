import { Injectable } from '@angular/core';

export interface PluggyConnectOptions {
  connectToken: string;
  connectorId: number;
}

/**
 * Adaptador do Pluggy Connect (widget oficial). Único arquivo que importa o pluggy-connect-sdk, carregado sob demanda.
 * Resolve com o id do item (banco conectado), ou null se o usuário fechar o widget sem concluir.
 * Rejeita quando o widget reporta erro.
 */
@Injectable({ providedIn: 'root' })
export class PluggyConnectService {
  async open(options: PluggyConnectOptions): Promise<string | null> {
    const { PluggyConnect } = await import('pluggy-connect-sdk');
    return new Promise((resolve, reject) => {
      let done = false;
      new PluggyConnect({
        connectToken: options.connectToken,
        selectedConnectorId: options.connectorId,
        onSuccess: ({ item }) => {
          done = true;
          resolve(item.id);
        },
        onError: (error) => {
          done = true;
          reject(error);
        },
        onClose: () => {
          if (!done) resolve(null);
        },
      })
        .init()
        .catch((error: unknown) => {
          done = true;
          reject(error);
        });
    });
  }
}
