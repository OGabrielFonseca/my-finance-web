/** Data sem fuso, como o LocalDate do backend: 'YYYY-MM-DD'. */
export type LocalDate = string;
/** Mês sem fuso, como o YearMonth do backend: 'YYYY-MM'. */
export type YearMonth = string;

const pad = (value: number) => String(value).padStart(2, '0');

/** Nunca use toISOString() para datas da API: ele converte para UTC e pode mudar o dia. */
export function toLocalDate(date: Date): LocalDate {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function fromLocalDate(value: LocalDate): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function toYearMonth(date: Date): YearMonth {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
}

export function fromYearMonth(value: YearMonth): Date {
  const [year, month] = value.split('-').map(Number);
  return new Date(year, month - 1, 1);
}
