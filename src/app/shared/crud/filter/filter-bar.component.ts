import { NgTemplateOutlet } from '@angular/common';
import type { OnInit } from '@angular/core';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { Button } from 'primeng/button';
import { Checkbox } from 'primeng/checkbox';
import { DatePicker } from 'primeng/datepicker';
import { Drawer } from 'primeng/drawer';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { debounceTime, merge } from 'rxjs';

import type { FilterField, FilterValue, LookupOption } from './filter';
import { countActiveFilters, filterToForm, formToFilter, sameFilter } from './filter';

/**
 * Filtros declarativos. O formulário é a fonte de verdade: cada mudança emite o filtro novo (texto com debounce de 300 ms).
 * "Limpar" volta ao initial. No desktop ficam em linha; abaixo de 1024 px, num drawer com contador de filtros ativos.
 * Os campos (fields) são fixos durante a vida do componente.
 */
@Component({
  selector: 'app-filter-bar',
  imports: [
    NgTemplateOutlet,
    ReactiveFormsModule,
    TranslocoPipe,
    Button,
    Checkbox,
    DatePicker,
    Drawer,
    InputText,
    Select,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './filter-bar.component.html',
})
export class FilterBarComponent<F extends object> implements OnInit {
  readonly fields = input.required<readonly FilterField[]>();
  /** Valor inicial do formulário e do botão "Limpar" (normalmente o initialFilter da lista). */
  readonly initial = input<Partial<F>>({});
  readonly changed = output<Partial<F>>();

  private readonly transloco = inject(TranslocoService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly drawerOpen = signal(false);
  /** Último filtro emitido: evita emitir de novo o que já está na lista. */
  private readonly current = signal<FilterValue>({});
  protected readonly activeCount = computed(() =>
    countActiveFilters(this.fields(), this.current(), this.initial() as FilterValue),
  );
  protected form!: FormGroup;

  ngOnInit(): void {
    const fields = this.fields();
    this.form = new FormGroup(Object.fromEntries(fields.map((f) => [f.key, new FormControl<unknown>(null)])));
    this.form.reset(filterToForm(fields, this.initial() as FilterValue), { emitEvent: false });
    this.current.set(formToFilter(fields, this.form.getRawValue()));

    const textChanges = fields
      .filter((f) => f.type === 'text')
      .map((f) => this.form.controls[f.key].valueChanges.pipe(debounceTime(300)));
    const otherChanges = fields.filter((f) => f.type !== 'text').map((f) => this.form.controls[f.key].valueChanges);
    merge(...textChanges, ...otherChanges)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.emitFilter());
  }

  protected clear(): void {
    // reset sem emitEvent: um único emitFilter no fim evita uma busca por controle.
    this.form.reset(filterToForm(this.fields(), this.initial() as FilterValue), { emitEvent: false });
    this.emitFilter();
    this.drawerOpen.set(false);
  }

  protected enumOptions(field: FilterField): { label: string; value: string }[] {
    if (field.type !== 'enum') return [];
    return field.options.map((value) => ({
      value,
      label: this.transloco.translate(`enums.${field.enumKey}.${value}`),
    }));
  }

  protected lookupOptions(field: FilterField): readonly LookupOption[] {
    return field.type === 'lookup' ? field.options() : [];
  }

  /** Emite só se o filtro do formulário for diferente do último emitido. */
  private emitFilter(): void {
    const filter = formToFilter(this.fields(), this.form.getRawValue());
    if (sameFilter(filter, this.current())) return;
    this.current.set(filter);
    this.changed.emit(filter as Partial<F>);
  }
}
