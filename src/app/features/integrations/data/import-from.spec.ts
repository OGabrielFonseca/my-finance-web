import { toLocalDate } from '@shared/data';

import { importFromChange, importFromRange } from './import-from';

describe('importFromRange', () => {
  it('vai de hoje − 12 meses até hoje', () => {
    const { min, max } = importFromRange(new Date(2026, 9, 17, 15, 40));

    expect(toLocalDate(min)).toBe('2025-10-17');
    expect(toLocalDate(max)).toBe('2026-10-17');
  });

  it('ignora a hora do dia', () => {
    const { max } = importFromRange(new Date(2026, 9, 17, 23, 59));

    expect(max.getHours()).toBe(0);
    expect(toLocalDate(max)).toBe('2026-10-17');
  });

  it('leva 29/02 para 28/02 do ano anterior, como o backend', () => {
    const { min } = importFromRange(new Date(2028, 1, 29));

    expect(toLocalDate(min)).toBe('2027-02-28');
  });

  it('mantém o dia quando o mês de destino tem esse dia', () => {
    const { min } = importFromRange(new Date(2026, 7, 31));

    expect(toLocalDate(min)).toBe('2025-08-31');
  });
});

describe('importFromChange', () => {
  it('data igual não muda nada', () => {
    expect(importFromChange('2026-01-10', '2026-01-10')).toBe('same');
  });

  it('data mais recente é "forward"', () => {
    expect(importFromChange('2026-01-10', '2026-03-01')).toBe('forward');
  });

  it('data mais antiga é "backward"', () => {
    expect(importFromChange('2026-03-01', '2026-01-10')).toBe('backward');
  });

  it('compara por dia, não por texto solto (dia 9 é antes de dia 10)', () => {
    expect(importFromChange('2026-01-09', '2026-01-10')).toBe('forward');
  });
});
