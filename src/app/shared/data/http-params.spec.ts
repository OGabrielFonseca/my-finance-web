import { toHttpParams } from './http-params';

describe('toHttpParams', () => {
  it('ignora null, undefined e string vazia', () => {
    const params = toHttpParams({ name: '', type: null, archived: undefined, accountId: 'a1' });
    expect(params.keys()).toEqual(['accountId']);
  });

  it('mantém false e zero', () => {
    const params = toHttpParams({ archived: false, amount: 0 });
    expect(params.get('archived')).toBe('false');
    expect(params.get('amount')).toBe('0');
  });

  it('converte Date em LocalDate', () => {
    expect(toHttpParams({ from: new Date(2026, 9, 12, 23, 0) }).get('from')).toBe('2026-10-12');
  });

  it('adiciona página, tamanho e ordenação', () => {
    const params = toHttpParams({}, { page: 2, size: 50, sort: { field: 'transactionDate', direction: 'desc' } });
    expect(params.toString()).toBe('page=2&size=50&sort=transactionDate,desc');
  });

  it('sem ordenação não envia sort', () => {
    expect(toHttpParams({}, { page: 0, size: 20 }).has('sort')).toBe(false);
  });
});
