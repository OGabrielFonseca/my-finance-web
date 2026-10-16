import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { environment } from '@env/environment';

/** Tipos mínimos do Google Identity Services (só o que este app usa). */
interface CredentialResponse {
  credential: string;
}

export interface GoogleButtonOptions {
  theme: 'outline' | 'filled_black';
  text: 'signin_with' | 'signup_with';
  width: number; // px, máx. 400 (limite do GIS)
}

interface GoogleAccountsId {
  initialize(config: { client_id: string; callback: (response: CredentialResponse) => void; ux_mode: 'popup' }): void;
  renderButton(parent: HTMLElement, options: Record<string, unknown>): void;
}

declare global {
  interface Window {
    google?: { accounts: { id: GoogleAccountsId } };
  }
}

const GSI_SCRIPT = 'https://accounts.google.com/gsi/client';

/**
 * Adaptador do Google Identity Services. Único arquivo que toca window.google.
 * Carrega o script uma vez, inicializa com o client ID e renderiza o botão oficial.
 */
@Injectable({ providedIn: 'root' })
export class GoogleIdentityService {
  private readonly document = inject(DOCUMENT);
  private loading?: Promise<GoogleAccountsId>;
  private onCredential?: (idToken: string) => void;

  readonly enabled = environment.googleClientId !== '';

  async renderButton(parent: HTMLElement, options: GoogleButtonOptions, onCredential: (idToken: string) => void) {
    const gsi = await this.load();
    this.onCredential = onCredential;
    // O GIS acrescenta um botão a cada chamada: limpa o contêiner para o re-render do tema não duplicar.
    parent.replaceChildren();
    gsi.renderButton(parent, { type: 'standard', size: 'large', shape: 'rectangular', locale: 'pt-BR', ...options });
  }

  private load(): Promise<GoogleAccountsId> {
    this.loading ??= loadScript(this.document, GSI_SCRIPT)
      .then(() => {
        const google = this.document.defaultView?.google;
        if (!google) throw new Error('window.google ausente depois de carregar o GIS');
        const gsi = google.accounts.id;
        gsi.initialize({
          client_id: environment.googleClientId,
          callback: ({ credential }) => this.onCredential?.(credential),
          ux_mode: 'popup',
        });
        return gsi;
      })
      .catch((error: unknown) => {
        this.loading = undefined; // permite tentar de novo ao voltar para a tela
        throw error;
      });
    return this.loading;
  }
}

function loadScript(document: Document, src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      script.remove();
      reject(new Error(`Falha ao carregar ${src}`));
    };
    document.head.appendChild(script);
  });
}
