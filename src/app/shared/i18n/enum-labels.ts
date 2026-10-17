import { Pipe, type PipeTransform } from '@angular/core';

/** Rótulos em português dos valores de enum da API. Um lugar só: templates e TS usam `enumLabel`. */
export const ENUM_LABELS = {
  accountType: {
    CHECKING: 'Conta corrente',
    SAVINGS: 'Poupança',
    WALLET: 'Carteira',
    INVESTMENT: 'Investimentos',
    OTHER: 'Outra',
  },
  categoryType: { INCOME: 'Receita', EXPENSE: 'Despesa' },
  transactionType: { INCOME: 'Receita', EXPENSE: 'Despesa', TRANSFER: 'Transferência' },
  transactionStatus: { PENDING: 'Pendente', CLEARED: 'Efetivado' },
  invoiceStatus: { OPEN: 'Aberta', CLOSED: 'Fechada', PAID: 'Paga' },
  assetClass: {
    STOCK: 'Ação',
    FII: 'FII',
    ETF: 'ETF',
    BDR: 'BDR',
    FIXED_INCOME: 'Renda fixa',
    TREASURY: 'Tesouro direto',
    FUND: 'Fundo',
    CRYPTO: 'Cripto',
  },
  incomeType: {
    DIVIDEND: 'Dividendo',
    JCP: 'JCP',
    FII_INCOME: 'Rendimento de FII',
    INTEREST: 'Juros',
    AMORTIZATION: 'Amortização',
  },
  operationType: { BUY: 'Compra', SELL: 'Venda', SPLIT: 'Desdobramento', BONUS: 'Bonificação' },
  indexer: { PRE: 'Pré-fixado', CDI: 'CDI', IPCA: 'IPCA', SELIC: 'Selic' },
  importStatus: { PENDING: 'Pendente', APPROVED: 'Aprovado', IGNORED: 'Ignorado' },
  yesNo: { true: 'Sim' },
} as const;

export type EnumLabelKind = keyof typeof ENUM_LABELS;

/** Rótulo do valor; se o valor não estiver mapeado, devolve o próprio valor. */
export function enumLabel(kind: EnumLabelKind | string, value: string): string {
  const labels = (ENUM_LABELS as Record<string, Record<string, string>>)[kind];
  return labels?.[value] ?? value;
}

@Pipe({ name: 'enumLabel' })
export class EnumLabelPipe implements PipeTransform {
  transform(value: unknown, kind: EnumLabelKind | string | undefined): string {
    return enumLabel(kind ?? '', value == null ? '' : String(value));
  }
}
