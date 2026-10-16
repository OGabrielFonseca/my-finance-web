import { TestBed } from '@angular/core/testing';

import { PluggyConnectService } from './pluggy-connect.service';

interface WidgetProps {
  connectToken: string;
  selectedConnectorId: number;
  onSuccess: (data: { item: { id: string } }) => void;
  onError: (error: { message: string }) => void;
  onClose: () => void;
}

const widget = vi.hoisted(() => ({
  props: null as WidgetProps | null,
  init: vi.fn(() => Promise.resolve()),
}));

vi.mock('pluggy-connect-sdk', () => ({
  PluggyConnect: class {
    constructor(props: WidgetProps) {
      widget.props = props;
    }
    init() {
      return widget.init();
    }
  },
}));

describe('PluggyConnectService', () => {
  let service: PluggyConnectService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PluggyConnectService);
    widget.props = null;
    widget.init.mockReset().mockResolvedValue(undefined);
  });

  /** open() carrega o SDK com import dinâmico: espera o widget ser criado antes de disparar os eventos. */
  async function open() {
    const result = service.open({ connectToken: 'token-1', connectorId: 200 });
    await vi.waitFor(() => expect(widget.props).not.toBeNull());
    return { result, props: widget.props as WidgetProps };
  }

  it('abre o widget com o token e o conector informados', async () => {
    const { props } = await open();

    expect(widget.init).toHaveBeenCalled();
    expect(props.connectToken).toBe('token-1');
    expect(props.selectedConnectorId).toBe(200);
  });

  it('onSuccess resolve com o id do item', async () => {
    const { result, props } = await open();

    props.onSuccess({ item: { id: 'item-1' } });

    await expect(result).resolves.toBe('item-1');
  });

  it('onClose sem sucesso resolve null', async () => {
    const { result, props } = await open();

    props.onClose();

    await expect(result).resolves.toBeNull();
  });

  it('onError rejeita com o erro do widget', async () => {
    const { result, props } = await open();

    props.onError({ message: 'falhou' });

    await expect(result).rejects.toEqual({ message: 'falhou' });
  });

  it('onClose depois de onSuccess não altera o resultado', async () => {
    const { result, props } = await open();

    props.onSuccess({ item: { id: 'item-2' } });
    props.onClose();

    await expect(result).resolves.toBe('item-2');
  });

  it('falha ao iniciar o widget rejeita a abertura', async () => {
    widget.init.mockRejectedValueOnce(new Error('sem rede'));

    const result = service.open({ connectToken: 'token-1', connectorId: 200 });

    await expect(result).rejects.toThrow('sem rede');
  });
});
