import { TestBed } from '@angular/core/testing';
import { environment } from '@env/environment';
import type { Mock } from 'vitest';

import { GoogleIdentityService } from './google-identity.service';
import type { GoogleButtonOptions } from './google-identity.service';

const SCRIPT_SELECTOR = 'script[src="https://accounts.google.com/gsi/client"]';
const options: GoogleButtonOptions = { theme: 'outline', text: 'signin_with', width: 320 };

describe('GoogleIdentityService', () => {
  let initialize: Mock<(config: { callback: (response: { credential: string }) => void }) => void>;
  let renderButton: Mock<(parent: HTMLElement, options: Record<string, unknown>) => void>;
  let callback: ((response: { credential: string }) => void) | undefined;

  /** Tag do script do GIS (falha o teste se ainda não foi criada). */
  function scriptTag(): HTMLScriptElement {
    const script = document.head.querySelector<HTMLScriptElement>(SCRIPT_SELECTOR);
    if (!script) throw new Error('script do GIS não foi criado');
    return script;
  }

  /** Simula o carregamento do script do GIS: expõe window.google e dispara o onload da tag. */
  function loadGsi(): void {
    window.google = { accounts: { id: { initialize, renderButton } } };
    scriptTag().dispatchEvent(new Event('load'));
  }

  /** Dispara o callback do GIS com o credential, como o botão faz quando o usuário escolhe a conta. */
  function credentialFromGoogle(credential: string): void {
    if (!callback) throw new Error('GIS não foi inicializado');
    callback({ credential });
  }

  beforeEach(() => {
    document.head.querySelectorAll(SCRIPT_SELECTOR).forEach((script) => script.remove());
    initialize = vi.fn((config: { callback: (response: { credential: string }) => void }) => {
      callback = config.callback;
    });
    renderButton = vi.fn();
    callback = undefined;
  });

  afterEach(() => {
    delete window.google;
  });

  it('carrega o script uma vez, inicializa o GIS uma vez e renderiza cada botão', async () => {
    const service = TestBed.inject(GoogleIdentityService);

    const first = service.renderButton(document.createElement('div'), options, vi.fn());
    const second = service.renderButton(document.createElement('div'), options, vi.fn());
    loadGsi();
    await Promise.all([first, second]);

    expect(document.head.querySelectorAll(SCRIPT_SELECTOR)).toHaveLength(1);
    expect(initialize).toHaveBeenCalledTimes(1);
    expect(initialize).toHaveBeenCalledWith(
      expect.objectContaining({ client_id: environment.googleClientId, ux_mode: 'popup' }),
    );
    expect(renderButton).toHaveBeenCalledTimes(2);
  });

  it('entrega o credential ao último onCredential registrado', async () => {
    const service = TestBed.inject(GoogleIdentityService);
    const previous = vi.fn();
    const latest = vi.fn();

    const first = service.renderButton(document.createElement('div'), options, previous);
    loadGsi();
    await first;
    await service.renderButton(document.createElement('div'), options, latest);
    credentialFromGoogle('id-token');

    expect(previous).not.toHaveBeenCalled();
    expect(latest).toHaveBeenCalledWith('id-token');
  });

  it('rejeita quando o script falha, remove a tag e tenta de novo na chamada seguinte', async () => {
    const service = TestBed.inject(GoogleIdentityService);

    const failed = service.renderButton(document.createElement('div'), options, vi.fn());
    scriptTag().dispatchEvent(new Event('error'));
    await expect(failed).rejects.toThrow('Falha ao carregar');
    expect(document.head.querySelector(SCRIPT_SELECTOR)).toBeNull();

    const retry = service.renderButton(document.createElement('div'), options, vi.fn());
    expect(document.head.querySelectorAll(SCRIPT_SELECTOR)).toHaveLength(1);
    loadGsi();
    await retry;

    expect(initialize).toHaveBeenCalledTimes(1);
  });
});
