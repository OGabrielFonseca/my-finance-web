import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { Button } from 'primeng/button';
import { Checkbox } from 'primeng/checkbox';
import { DatePicker } from 'primeng/datepicker';
import { Drawer } from 'primeng/drawer';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { debounceTime, distinctUntilChanged, map, merge } from 'rxjs';

import type { FilterField, FilterValue, LookupOption } from './filter';
import { countActiveFilters, filterToForm, formToFilter, sameFilter } from './filter';

/**
 * Filtros declarativos. Texto aplica com debounce de 300 ms; os demais ao mudar.
 * No desktop ficam em linha; abaixo de 1024 px, num drawer com contador de filtros ativos.
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
export class FilterBarComponent<F extends object> {
  readonly fields = input.required<readonly FilterField[]>();
  readonly value = input.required<Partial<F>>();
  /** Valor do botão "Limpar" (normalmente o initialFilter da lista). */
  readonly initial = input<Partial<F>>({});
  readonly changed = output<Partial<F>>();

  private readonly transloco = inject(TranslocoService);
  protected readonly drawerOpen = signal(false);
  protected readonly form = computed(
    () => new FormGroup(Object.fromEntries(this.fields().map((f) => [f.key, new FormControl<unknown>(null)]))),
  );
  protected readonly activeCount = computed(() =>
    countActiveFilters(this.fields(), this.value() as FilterValue, this.initial() as FilterValue),
  );

  constructor() {
    // Mudanças do formulário → filtro (texto com debounce).
    effect((onCleanup) => {
      const form = this.form();
      const fields = untracked(this.fields);
      const textChanges = fields
        .filter((f) => f.type === 'text')
        .map((f) => form.controls[f.key].valueChanges.pipe(debounceTime(300)));
      const otherChanges = fields.filter((f) => f.type !== 'text').map((f) => form.controls[f.key].valueChanges);
      const subscription = merge(...textChanges, ...otherChanges)
        .pipe(
          map(() => formToFilter(fields, form.getRawValue())),
          distinctUntilChanged(sameFilter),
        )
        .subscribe((filter) => {
          if (!sameFilter(filter, this.value())) this.changed.emit(filter as Partial<F>);
        });
      onCleanup(() => subscription.unsubscribe());
    });

    // Filtro de fora (URL, Limpar) → formulário. Não mexe se já for o mesmo (evita pular o cursor ao digitar).
    effect(() => {
      const value = this.value() as FilterValue;
      const form = this.form();
      untracked(() => {
        if (sameFilter(formToFilter(this.fields(), form.getRawValue()), value)) return;
        form.reset(filterToForm(this.fields(), value), { emitEvent: false });
      });
    });
  }

  protected clear(): void {
    this.changed.emit(this.initial());
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
}
