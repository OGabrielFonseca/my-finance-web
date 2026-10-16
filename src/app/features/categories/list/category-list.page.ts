import { EnumLabelPipe } from '@shared/i18n/enum-labels';
import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CrudActionsService } from '@shared/crud/page';
import { CrudPageComponent } from '@shared/crud/page';
import { EmptyStateComponent } from '@shared/ui';
import type { TreeNode } from 'primeng/api';
import { Button } from 'primeng/button';
import { Checkbox } from 'primeng/checkbox';
import { Tab, TabList, Tabs } from 'primeng/tabs';
import { Tag } from 'primeng/tag';
import { TreeTableModule } from 'primeng/treetable';
import { finalize } from 'rxjs';

import { buildCategoryTree } from '../data/category-tree';
import { CategoryApiService } from '../data/category-api.service';
import { ActiveCategoryLookupService, AllCategoryLookupService } from '../data/category-lookup.service';
import type { Category, CategoryType } from '../data/category.model';
import { CATEGORY_TYPES } from '../data/category.model';
import type { CategoryFormData } from '../form/category-form.component';
import { CategoryFormComponent } from '../form/category-form.component';

/** Árvore de categorias por tipo. Sem paginação: carrega todas do tipo (limite de 100 da API). */
@Component({
  selector: 'app-category-list-page',
  imports: [
    EnumLabelPipe,
    FormsModule,
    CrudPageComponent,
    EmptyStateComponent,
    Button,
    Checkbox,
    Tab,
    TabList,
    Tabs,
    Tag,
    TreeTableModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './category-list.page.html',
})
export class CategoryListPage {
  private readonly api = inject(CategoryApiService);
  private readonly crud = inject(CrudActionsService);
  private readonly activeLookup = inject(ActiveCategoryLookupService);
  private readonly allLookup = inject(AllCategoryLookupService);

  protected readonly types = CATEGORY_TYPES;
  protected readonly type = signal<CategoryType>('EXPENSE');
  protected readonly onlyArchived = signal(false);
  protected readonly nodes = signal<TreeNode<Category>[]>([]);
  protected readonly loading = signal(false);
  private readonly version = signal(0);

  constructor() {
    effect((onCleanup) => {
      const filter = { type: this.type(), archived: this.onlyArchived() };
      this.version();
      this.loading.set(true);
      const subscription = this.api
        .listAll(filter)
        .pipe(finalize(() => this.loading.set(false)))
        .subscribe((items) => this.nodes.set(buildCategoryTree(items.filter((c) => !c.system))));
      onCleanup(() => subscription.unsubscribe());
    });
  }

  protected selectType(value: string | number | undefined): void {
    if (value === 'INCOME' || value === 'EXPENSE') this.type.set(value);
  }

  protected create(): void {
    this.openForm({ type: this.type() }, 'Nova categoria');
  }

  protected addSub(parent: Category): void {
    this.openForm({ type: parent.type, parent }, 'Nova subcategoria');
  }

  protected edit(category: Category): void {
    this.openForm({ type: category.type, category }, 'Editar categoria');
  }

  protected archive(category: Category): void {
    this.crud
      .confirmAndRun('archive', category.name, () => this.api.archive(category.id))
      .subscribe(() => this.refresh());
  }

  private openForm(data: CategoryFormData, header: string): void {
    this.crud.openForm(CategoryFormComponent, header, data).subscribe((saved) => {
      if (saved) this.refresh();
    });
  }

  private refresh(): void {
    this.activeLookup.invalidate();
    this.allLookup.invalidate();
    this.version.update((v) => v + 1);
  }
}
