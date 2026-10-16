import { validationMessage } from './validation-message';

describe('validationMessage', () => {
  it('erro do servidor aparece como veio', () => {
    expect(validationMessage({ server: 'deve ser maior que 0' })).toBe('deve ser maior que 0');
  });

  it('erro do Angular vira texto em português com os parâmetros', () => {
    expect(validationMessage({ maxlength: { requiredLength: 100, actualLength: 120 } })).toBe(
      'Máximo de 100 caracteres',
    );
    expect(validationMessage({ required: true })).toBe('Campo obrigatório');
  });

  it('erro desconhecido usa a mensagem genérica', () => {
    expect(validationMessage({ meuErro: true })).toBe('Valor inválido');
  });
});
