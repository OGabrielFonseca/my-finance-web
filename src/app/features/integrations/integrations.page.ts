import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { injectCrudList } from '@shared/crud/list';
import type { ColumnDef } from '@shared/crud/table';
import { CellDirective, DataTableComponent } from '@shared/crud/table';
import { NotifierService } from '@shared/ui';
import { ConfirmationService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { InputText } from 'primeng/inputtext';
import { Tag } from 'primeng/tag';
import { TableModule } from 'primeng/table';
import { firstValueFrom } from 'rxjs';

import { IntegrationCredentialsComponent } from './credentials/integration-credentials.component';
import { IntegrationApiService } from './data/integration-api.service';
import type { ConnectionStatus, Integration, IntegrationConnection, IntegrationLog } from './data/integration.model';
import { PluggyConnectService } from './data/pluggy-connect.service';

/** Meu Pluggy (conector gratuito). A página só oferece o Pluggy por enquanto. */
const PLUGGY_CONNECTOR_ID = 200;
const LOGS_PAGE_SIZE = 10;
const NAME_MAX_LENGTH = 100;

const STATUS_LABELS: Record<ConnectionStatus, string> = {
  PENDING_SYNC: 'Aguardando 1ª sincronização',
  OK: 'OK',
  ERROR: 'Erro',
};
const LEVEL_LABELS: Record<IntegrationLog['level'], string> = { INFO: 'Info', ERROR: 'Erro' };
const OPERATION_LABELS: Partial<Record<string, string>> = {
  SAVE_CREDENTIALS: 'Credenciais salvas',
  CONNECT_TOKEN: 'Abertura do widget',
  REGISTER_CONNECTION: 'Banco conectado',
  DELETE_CONNECTION: 'Banco removido',
  DELETE_INTEGRATION: 'Integração removida',
  SYNC: 'Sincronização',
};

@Component({
  selector: 'app-integrations-page',
  imports: [
    CellDirective,
    DataTableComponent,
    DatePipe,
    IntegrationCredentialsComponent,
    ReactiveFormsModule,
    Button,
    Card,
    InputText,
    Tag,
    TableModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './integrations.page.html',
})
export class IntegrationsPage {
  private readonly api = inject(IntegrationApiService);
  private readonly pluggy = inject(PluggyConnectService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly notifier = inject(NotifierService);

  protected readonly integration = signal<Integration | null>(null);
  protected statusLabel(status: ConnectionStatus): string {
    return STATUS_LABELS[status];
  }

  protected levelLabel(level: IntegrationLog['level']): string {
    return LEVEL_LABELS[level];
  }

  protected operationLabel(operation: string): string {
    return OPERATION_LABELS[operation] ?? operation;
  }

  protected readonly connections = computed(() => this.integration()?.connections ?? []);
  protected readonly canConnect = computed(() => {
    const integration = this.integration();
    return !!integration?.configured && integration.connections.length < integration.maxConnections;
  });

  // "opening" vai até o widget abrir; "registering" cobre a confirmação da conexão na API.
  protected readonly opening = signal(false);
  protected readonly registering = signal(false);

  protected readonly editingId = signal<string | null>(null);
  protected readonly nameControl = new FormControl('', {
    nonNullable: true,
    validators: [Validators.maxLength(NAME_MAX_LENGTH)],
  });

  protected readonly logs = injectCrudList<IntegrationLog, object>(
    { list: (_filter, page) => this.api.logs(page) },
    { size: LOGS_PAGE_SIZE },
  );
  protected readonly logColumns: ColumnDef<IntegrationLog>[] = [
    { field: 'createdAt', header: 'Data', sortField: false },
    { field: 'level', header: 'Nível', sortField: false },
    { field: 'operation', header: 'Operação', sortField: false },
    { field: 'connectionId', header: 'Banco', sortField: false },
    { field: 'message', header: 'Mensagem', sortField: false },
  ];

  constructor() {
    this.load();
  }

  protected reloadAll(): void {
    this.load();
    this.logs.reload();
  }

  protected connectionName(connection: IntegrationConnection): string {
    return connection.name ?? 'Banco sem nome';
  }

  protected connectionLabel(connectionId: string | null): string {
    if (!connectionId) return '';
    const connection = this.connections().find((c) => c.id === connectionId);
    return connection ? this.connectionName(connection) : '';
  }

  protected statusSeverity(status: ConnectionStatus): 'success' | 'danger' | 'info' {
    if (status === 'OK') return 'success';
    if (status === 'ERROR') return 'danger';
    return 'info';
  }

  protected async connect(): Promise<void> {
    if (!this.canConnect() || this.opening() || this.registering()) return;

    this.opening.set(true);
    let accessToken: string;
    try {
      ({ accessToken } = await firstValueFrom(this.api.createConnectToken()));
    } catch {
      // O errorInterceptor já mostrou o motivo.
      this.opening.set(false);
      return;
    }

    let itemId: string | null;
    try {
      const widget = this.pluggy.open({ connectToken: accessToken, connectorId: PLUGGY_CONNECTOR_ID });
      this.opening.set(false); // o widget está na tela: o botão deixa de girar
      itemId = await widget;
    } catch {
      this.notifier.error('Não foi possível conectar o banco');
      return;
    }
    if (itemId) await this.register(itemId);
  }

  protected startRename(connection: IntegrationConnection): void {
    this.nameControl.setValue(connection.name ?? '');
    this.editingId.set(connection.id);
  }

  protected cancelRename(): void {
    this.editingId.set(null);
  }

  protected saveRename(connection: IntegrationConnection): void {
    if (this.nameControl.invalid) return;
    const name = this.nameControl.value.trim() || null;
    this.api.renameConnection(connection.id, name).subscribe(() => {
      this.editingId.set(null);
      this.reloadAll();
    });
  }

  protected deleteConnection(connection: IntegrationConnection): void {
    this.confirmation.confirm({
      header: 'Excluir',
      message: 'Remove só no MyFinance. Para revogar o acesso, use o Meu Pluggy.',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Excluir',
      rejectLabel: 'Cancelar',
      acceptButtonProps: { severity: 'danger' },
      rejectButtonProps: { severity: 'secondary', text: true },
      accept: () =>
        this.api.deleteConnection(connection.id).subscribe(() => {
          this.notifier.success('Banco removido');
          this.reloadAll();
        }),
    });
  }

  private load(): void {
    this.api.get().subscribe((integration) => this.integration.set(integration));
  }

  private async register(externalId: string): Promise<void> {
    this.registering.set(true);
    try {
      await firstValueFrom(this.api.registerConnection(externalId));
      this.notifier.success('Banco conectado');
      this.reloadAll();
    } catch {
      // Erro de API: o errorInterceptor já mostrou o motivo.
    } finally {
      this.registering.set(false);
    }
  }
}
