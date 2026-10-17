import type { LocalDate } from '@shared/data';

export interface ImportFromRange {
  min: Date;
  max: Date;
}

export type ImportFromChange = 'same' | 'forward' | 'backward';

/**
 * Período que a API aceita para a data de corte: de hoje − 12 meses até hoje (API §1.1).
 * O mínimo segue o LocalDate.minusMonths(12) do backend: se o dia não existe no mês de destino, vai para o último dia.
 */
export function importFromRange(today: Date): ImportFromRange {
  const max = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const year = max.getFullYear() - 1;
  const month = max.getMonth();
  const lastDay = new Date(year, month + 1, 0).getDate();
  const min = new Date(year, month, Math.min(max.getDate(), lastDay));
  return { min, max };
}

/**
 * Compara a data atual da conta com a nova (datas 'YYYY-MM-DD'). Mais recente ignora pendentes antigos; mais antiga faz
 * busca retroativa (API §1.3). Datas nesse formato comparam certo como texto.
 */
export function importFromChange(current: LocalDate, next: LocalDate): ImportFromChange {
  if (next === current) return 'same';
  return next > current ? 'forward' : 'backward';
}
