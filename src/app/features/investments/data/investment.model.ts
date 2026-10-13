import type { AccountSummary } from '@features/accounts';
import type { LookupOption } from '@shared/crud/filter';
import type { LocalDate } from '@shared/data';

export const ASSET_CLASSES = ['STOCK', 'FII', 'ETF', 'BDR', 'FIXED_INCOME', 'TREASURY', 'FUND', 'CRYPTO'] as const;
export type AssetClass = (typeof ASSET_CLASSES)[number];

export const INDEXERS = ['PRE', 'CDI', 'IPCA', 'SELIC'] as const;
export type Indexer = (typeof INDEXERS)[number];

export const OPERATION_TYPES = ['BUY', 'SELL', 'SPLIT', 'BONUS'] as const;
export type OperationType = (typeof OPERATION_TYPES)[number];

export const INCOME_TYPES = ['DIVIDEND', 'JCP', 'FII_INCOME', 'INTEREST', 'AMORTIZATION'] as const;
export type IncomeType = (typeof INCOME_TYPES)[number];

/** Renda fixa e Tesouro têm detalhes próprios; as demais classes não têm. */
export const isFixedIncomeClass = (assetClass: AssetClass | null): boolean =>
  assetClass === 'FIXED_INCOME' || assetClass === 'TREASURY';

/** Compra e venda têm preço unitário e taxas; desdobramento e bonificação não. */
export const isTradeType = (type: OperationType | null): boolean => type === 'BUY' || type === 'SELL';

export interface FixedIncome {
  issuer: string | null;
  indexer: Indexer;
  /** Em %: 110 para "110% do CDI", 6.5 para "IPCA + 6,5%". */
  rate: number;
  maturityDate: LocalDate | null;
  taxExempt: boolean;
}

export interface Asset {
  id: string;
  ticker: string;
  name: string;
  assetClass: AssetClass;
  currency: string;
  fixedIncome: FixedIncome | null;
  createdAt: string;
  updatedAt: string;
}

export interface AssetSummary {
  id: string;
  ticker: string;
  name: string;
  assetClass: AssetClass;
}

export interface FixedIncomeRequest {
  issuer?: string;
  indexer: Indexer;
  rate: number;
  maturityDate?: LocalDate;
  taxExempt: boolean;
}

export interface CreateAssetRequest {
  ticker: string;
  name: string;
  assetClass: AssetClass;
  fixedIncome?: FixedIncomeRequest;
}

/** A classe do ativo não muda na edição. */
export interface UpdateAssetRequest {
  ticker: string;
  name: string;
  fixedIncome?: FixedIncomeRequest;
}

export interface AssetFilter {
  assetClass: AssetClass;
  search: string;
}

export interface AssetPosition {
  assetId: string;
  ticker: string;
  name: string;
  assetClass: AssetClass;
  quantity: number;
  averagePrice: number;
  totalCost: number;
}

export interface Operation {
  id: string;
  account: AccountSummary;
  asset: AssetSummary;
  type: OperationType;
  operationDate: LocalDate;
  quantity: number;
  unitPrice: number | null;
  fees: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOperationRequest {
  accountId: string;
  assetId: string;
  type: OperationType;
  date: LocalDate;
  quantity: number;
  unitPrice?: number;
  fees?: number;
}

/** O ativo não muda na edição. */
export interface UpdateOperationRequest {
  accountId: string;
  type: OperationType;
  date: LocalDate;
  quantity: number;
  unitPrice?: number;
  fees?: number;
}

export interface OperationFilter {
  assetId: string;
  accountId: string;
  type: OperationType;
  from: LocalDate;
  to: LocalDate;
}

export interface Income {
  id: string;
  account: AccountSummary;
  asset: AssetSummary;
  type: IncomeType;
  paymentDate: LocalDate;
  grossAmount: number;
  taxAmount: number;
  netAmount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateIncomeRequest {
  accountId: string;
  assetId: string;
  type: IncomeType;
  paymentDate: LocalDate;
  grossAmount: number;
  taxAmount?: number;
}

/** O ativo não muda na edição. */
export interface UpdateIncomeRequest {
  accountId: string;
  type: IncomeType;
  paymentDate: LocalDate;
  grossAmount: number;
  taxAmount?: number;
}

export interface IncomeFilter {
  assetId: string;
  accountId: string;
  type: IncomeType;
  from: LocalDate;
  to: LocalDate;
}

export interface PortfolioAllocation {
  assetClass: AssetClass;
  totalCost: number;
  /** De 0 a 100, participação no custo total. */
  percentage: number;
}

export interface Portfolio {
  totalCost: number;
  allocation: PortfolioAllocation[];
  positions: AssetPosition[];
}

export function toAssetOptions(assets: readonly AssetSummary[]): LookupOption[] {
  return assets.map((asset) => ({ value: asset.id, label: `${asset.ticker} · ${asset.name}` }));
}
