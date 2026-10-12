import { fromLocalDate, fromYearMonth, toLocalDate, toYearMonth } from './dates';

describe('dates', () => {
  it('toLocalDate usa a data local, não UTC (lançamento às 23h continua no mesmo dia)', () => {
    expect(toLocalDate(new Date(2026, 9, 12, 23, 30))).toBe('2026-10-12');
  });

  it('toLocalDate completa com zeros', () => {
    expect(toLocalDate(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  it('fromLocalDate cria meia-noite local', () => {
    const date = fromLocalDate('2026-10-12');
    expect([date.getFullYear(), date.getMonth(), date.getDate(), date.getHours()]).toEqual([2026, 9, 12, 0]);
  });

  it('ida e volta preserva a data', () => {
    expect(toLocalDate(fromLocalDate('2026-02-28'))).toBe('2026-02-28');
  });

  it('toYearMonth e fromYearMonth', () => {
    expect(toYearMonth(new Date(2026, 8, 30, 23, 59))).toBe('2026-09');
    expect(toLocalDate(fromYearMonth('2026-09'))).toBe('2026-09-01');
  });
});
