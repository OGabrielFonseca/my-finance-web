import { DatePipe } from '@angular/common';
import type { OnInit } from '@angular/core';
import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FilterBarComponent } from '@shared/crud/filter';
import type { FilterField, LookupOption } from '@shared/crud/filter';
import { injectCrudList } from '@shared/crud/list';
import { EnumLabelPipe } from '@shared/i18n/enum-labels';
import { EmptyStateComponent, MoneyComponent, NotifierService } from '@shared/ui';
import { ConfirmationService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { Select } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { Tag } from 'primeng/tag';
import { ActiveCategoryLookupService } from '../categories/data/category-lookup.service';
import type { CategorySummary } from '../categories/data/category.model';
import { IntegrationApiService } from '../integrations/data/integration-api.service';
import type { BankAccountLink } from '../integrations/data/integration.model';
import { ImportApiService } from './data/import-api.service';
import { ImportCountStore } from './data/import-count.store';
import type { ImportFilter, ImportItem } from './data/import.model';
import { IMPORT_STATUSES, toApproveRequest } from './data/import.model';

const PAGE_SIZE = 50;

@Component({
  selector: 'app-imports-page',
  imports: [
    DatePipe,
    EnumLabelPipe,
    FormsModule,
    RouterLink,
    FilterBarComponent,
    EmptyStateComponent,
    MoneyComponent,
    Button,
    Card,
    Select,
    TableModule,
    Tag,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './imports.page.html',
})
export class ImportsPage implements OnInit {
  private readonly api = inject(ImportApiService);
  private readonly integrations = inject(IntegrationApiService);
  private readonly count = inject(ImportCountStore);
  private readonly confirmation = inject(ConfirmationService);
  private readonly notifier = inject(NotifierService);
  private readonly categories = inject(ActiveCategoryLookupService);

  /** Vindo do atalho "N pendentes na fila" da tela de integrações. */
  private readonly accountLinkId = inject(ActivatedRoute).snapshot.queryParamMap.get('accountLinkId');
  protected readonly initialFilter: Partial<ImportFilter> = {
    status: 'PENDING',
    ...(this.accountLinkId ? { accountLinkId: this.accountLinkId } : {}),
  };

  protected readonly list = injectCrudList<ImportItem, ImportFilter>(this.api, {
    initialFilter: this.initialFilter,
    size: PAGE_SIZE,
  });

  /** Contas do banco já vinculadas: opções do filtro e base do "Vincular" da tela de integrações. */
  private readonly linkedAccounts = signal<BankAccountLink[]>([]);
  protected readonly linkedLoaded = signal(false);
  protected readonly linkedOptions = computed<LookupOption[]>(() =>
    this.linkedAccounts()
      .filter((link) => link.status === 'LINKED')
      .map((link) => ({
        value: link.id,
        label: `${link.connection.name ?? 'Banco sem nome'} · ${link.account?.name ?? link.externalName}`,
      })),
  );

  protected readonly filters: FilterField[] = [
    { key: 'status', type: 'enum', label: 'Status', enumKey: 'importStatus', options: IMPORT_STATUSES },
    { key: 'accountLinkId', type: 'lookup', label: 'Conta do banco', options: this.linkedOptions },
    { key: 'period', type: 'dateRange', label: 'Período', fromKey: 'from', toKey: 'to' },
    { key: 'possibleTransfer', type: 'enum', label: 'Possível transferência', enumKey: 'yesNo', options: ['true'] },
  ];

  /** Seleção do lote (só itens pendentes podem ser selecionados). */
  protected readonly selected = signal<ImportItem[]>([]);

  /** Categoria escolhida por item. Começa com a sugestão; o usuário pode trocar linha a linha. */
  protected readonly categoryByItem = signal<ReadonlyMap<string, string>>(new Map());

  private readonly incomeOptions = computed(() => this.categoryOptions('INCOME'));
  private readonly expenseOptions = computed(() => this.categoryOptions('EXPENSE'));

  protected readonly first = computed(() => this.list.page().page * this.list.page().size);

  constructor() {
    // Sugestão de categoria entra no mapa quando o item aparece; escolhas do usuário não são sobrescritas.
    effect(() => {
      const items = this.list.items();
      untracked(() => {
        const next = new Map(this.categoryByItem());
        let changed = false;
        for (const item of items) {
          if (!next.has(item.id) && item.suggestedCategory) {
            next.set(item.id, item.suggestedCategory.id);
            changed = true;
          }
        }
        if (changed) this.categoryByItem.set(next);
      });
    });
  }

  ngOnInit(): void {
    this.categories.ensureLoaded();
    this.integrations.accounts().subscribe((links) => {
      this.linkedAccounts.set(links);
      this.linkedLoaded.set(true);
    });
  }

  protected categoryOptionsFor(item: ImportItem): { label: string; value: string }[] {
    return item.type === 'INCOME' ? this.incomeOptions() : this.expenseOptions();
  }

  protected categoryFor(item: ImportItem): string | null {
    return this.categoryByItem().get(item.id) ?? null;
  }

  protected setCategory(item: ImportItem, categoryId: string | null): void {
    const next = new Map(this.categoryByItem());
    if (categoryId) next.set(item.id, categoryId);
    else next.delete(item.id);
    this.categoryByItem.set(next);
  }

  protected approve(items: readonly ImportItem[]): void {
    const pending = items.filter((item) => item.status === 'PENDING');
    const { request, withoutCategory } = toApproveRequest(pending, this.categoryByItem());
    if (!request.items.length) return;

    const run = (): void => {
      this.api.approve(request).subscribe(({ approved }) => {
        this.notifier.success(`${approved} ${approved === 1 ? 'lançamento criado' : 'lançamentos criados'}`);
        this.afterChange();
      });
    };
    if (!withoutCategory) return run();

    this.confirmation.confirm({
      header: 'Aprovar',
      message: `${withoutCategory} ${withoutCategory === 1 ? 'item ficará' : 'itens ficarão'} de fora por não ter categoria. Aprovar os demais?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Aprovar',
      rejectLabel: 'Cancelar',
      rejectButtonProps: { severity: 'secondary', text: true },
      accept: run,
    });
  }

  protected ignore(items: readonly ImportItem[]): void {
    const ids = items.filter((item) => item.status === 'PENDING').map((item) => item.id);
    if (!ids.length) return;

    this.confirmation.confirm({
      header: 'Ignorar',
      message: `Ignorar ${ids.length === 1 ? 'este item' : `${ids.length} itens`}? Eles saem da fila.`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Ignorar',
      rejectLabel: 'Cancelar',
      acceptButtonProps: { severity: 'danger' },
      rejectButtonProps: { severity: 'secondary', text: true },
      accept: () =>
        this.api.ignore({ ids }).subscribe(() => {
          this.notifier.success(ids.length === 1 ? 'Item ignorado' : `${ids.length} itens ignorados`);
          this.afterChange();
        }),
    });
  }

  protected onLazyLoad(event: { first?: number | null; rows?: number | null }): void {
    const size = event.rows ?? this.list.page().size;
    this.list.setPage({ page: Math.floor((event.first ?? 0) / size), size });
  }

  protected onSelection(rows: ImportItem[]): void {
    this.selected.set(rows);
  }

  private categoryOptions(type: CategorySummary['type']): { label: string; value: string }[] {
    return this.categories
      .items()
      .filter((category) => category.type === type)
      .map((category) => ({ label: category.name, value: category.id }));
  }

  private afterChange(): void {
    this.selected.set([]);
    this.list.reload();
    this.count.refresh();
  }
}
