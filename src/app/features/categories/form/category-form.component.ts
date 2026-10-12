import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';
import { FieldComponent } from '@shared/forms/field.component';
import { FormFooterComponent } from '@shared/forms/form-footer.component';
import { injectFormSubmit } from '@shared/forms/form-submit';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';

import { CategoryApi } from '../data/category.api';
import type { Category, CategoryType } from '../data/category.model';
import { CATEGORY_COLORS, CATEGORY_ICONS } from '../data/category.model';

/** Dados do diálogo: o tipo vem da aba; parent para nova subcategoria; category para edição (não há GET /{id}). */
export interface CategoryFormData {
  type: CategoryType;
  parent?: Category;
  category?: Category;
}

@Component({
  selector: 'app-category-form',
  imports: [ReactiveFormsModule, TranslocoPipe, FieldComponent, FormFooterComponent, InputText, Select],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './category-form.component.html',
})
export class CategoryFormComponent {
  private readonly api = inject(CategoryApi);
  protected readonly ref = inject(DynamicDialogRef);
  protected readonly data = inject(DynamicDialogConfig).data as CategoryFormData;

  protected readonly colors = CATEGORY_COLORS.map((value) => ({ value }));
  protected readonly icons = CATEGORY_ICONS.map((value) => ({ value }));

  private readonly editing = this.data.category;
  private readonly parent = this.data.parent;

  protected readonly form = inject(NonNullableFormBuilder).group({
    name: [this.editing?.name ?? '', [Validators.required, Validators.maxLength(60)]],
    color: [this.editing?.color ?? this.parent?.color ?? CATEGORY_COLORS[0]],
    icon: [this.editing?.icon ?? this.parent?.icon ?? CATEGORY_ICONS[CATEGORY_ICONS.length - 1]],
  });

  protected readonly submit = injectFormSubmit(
    this.form,
    (value, context) =>
      this.editing
        ? this.api.update(this.editing.id, value, context)
        : this.api.create(
            { ...value, type: this.parent ? undefined : this.data.type, parentId: this.parent?.id },
            context,
          ),
    () => this.ref.close(true),
  );
}
