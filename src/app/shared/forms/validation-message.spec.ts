import { validationMessage } from './validation-message';

const translate = (key: string, params?: Record<string, unknown>) => `${key}${params ? JSON.stringify(params) : ''}`;

describe('validationMessage', () => {
  it('erro do servidor aparece como veio', () => {
    expect(validationMessage({ server: 'deve ser maior que 0' }, translate)).toBe('deve ser maior que 0');
  });

  it('erro do Angular vira chave validation.<erro> com os parâmetros', () => {
    expect(validationMessage({ maxlength: { requiredLength: 100, actualLength: 120 } }, translate)).toBe(
      'validation.maxlength{"requiredLength":100,"actualLength":120}',
    );
    expect(validationMessage({ required: true }, translate)).toBe('validation.required{}');
  });

  it('erro desconhecido usa validation.invalid', () => {
    expect(validationMessage({ meuErro: true }, translate)).toBe('validation.invalid{}');
  });
});
