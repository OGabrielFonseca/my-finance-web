/**
 * Ids fixos no formato UUID para o seed: recarregar a página recria os mesmos ids, então filtros na URL continuam válidos.
 * O primeiro caractere identifica o tipo: 1 usuário, a conta, c categoria, e lançamento, f fatura.
 */
export function seedId(group: '1' | 'a' | 'c' | 'e' | 'f', n: number): string {
  return `${group}0000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
}

/** Id de registro criado durante o uso do protótipo. */
export function newId(): string {
  return crypto.randomUUID();
}

/** Instante fixo do seed (createdAt/updatedAt), derivado da data do registro. */
export function seedInstant(date: string): string {
  return `${date}T12:00:00Z`;
}
