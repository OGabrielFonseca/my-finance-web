/** Espelha os DTOs de /integrations/{provider} (escrito à mão, sem geração de código). */
export type IntegrationProvider = 'PLUGGY';
export type ConnectionStatus = 'PENDING_SYNC' | 'OK' | 'ERROR' | 'SYNCING';
export type LogLevel = 'INFO' | 'ERROR';

export interface IntegrationField {
  name: string;
  secret: boolean;
  required: boolean;
  /** Sempre null para campo secreto. */
  value: string | null;
  /** Só para secretos: já existe um valor salvo. */
  filled?: boolean;
}

export interface IntegrationConnection {
  id: string;
  externalId: string;
  name: string | null;
  status: ConnectionStatus;
  lastSyncAt: string | null;
  createdAt: string;
}

export interface Integration {
  provider: IntegrationProvider;
  configured: boolean;
  fields: IntegrationField[];
  maxConnections: number;
  connections: IntegrationConnection[];
}

export interface IntegrationLog {
  id: string;
  connectionId: string | null;
  operation: string;
  level: LogLevel;
  message: string;
  createdAt: string;
}

export interface SaveIntegrationRequest {
  data: Record<string, string>;
}

export interface ConnectTokenResponse {
  accessToken: string;
}

export interface RegisterConnectionRequest {
  externalId: string;
}

export interface RenameConnectionRequest {
  name: string | null;
}

/** Contadores de uma sincronização (POST /connections/{id}/sync). */
export interface SyncSummary {
  accounts: number;
  newAccounts: number;
  newItems: number;
  skipped: number;
}

/**
 * Resultado de um banco no POST /sync. error é o código do erro (ex.: integration.PROVIDER_UNAVAILABLE), não texto para
 * o usuário: a tela mostra uma mensagem genérica.
 */
export interface SyncOutcome {
  connectionId: string;
  status: 'OK' | 'ERROR' | 'SKIPPED';
  summary: SyncSummary | null;
  error: string | null;
}

export type LinkStatus = 'PENDING' | 'LINKED' | 'IGNORED' | 'UNSUPPORTED';
export type BankAccountKind = 'BANK' | 'CREDIT' | 'OTHER';

/** Conta encontrada no banco (GET /accounts): vínculo de tipo ACCOUNT. */
export interface BankAccountLink {
  id: string;
  connection: { id: string; name: string | null };
  externalName: string;
  number: string | null;
  kind: BankAccountKind;
  status: LinkStatus;
  account: { id: string; name: string; type: string } | null;
  importFrom: string | null;
  bankBalance: number | null;
  bankBalanceAt: string | null;
  myFinanceBalance: number | null;
  pendingItems: number;
}

export interface LinkAccountRequest {
  accountId: string;
  importFrom: string;
}

export interface CreateBankAccountRequest {
  name: string;
  type: 'CHECKING' | 'SAVINGS';
}
