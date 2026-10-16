/** Espelha os DTOs de /integrations/{provider} (escrito à mão, sem geração de código). */
export type IntegrationProvider = 'PLUGGY';
export type ConnectionStatus = 'PENDING_SYNC' | 'OK' | 'ERROR';
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
