import type { Signal } from '@angular/core';

import { fromLocalDate, toLocalDate } from '../../data/dates';

/** Opção de seletor vinda de um LookupService. depth indenta subcategorias; color mostra a bolinha da categoria. */
export interface LookupOption {
  value: string;
  label: string;
  depth?: number;
  color?: string | null;
}

interface BaseField {
  key: string; // mesmo nome do query param da API
  label: string; // chave i18n
}

export type FilterField =
  | (BaseField & { type: 'text' })
  | (BaseField & { type: 'enum'; enumKey: string; options: readonly string[] })
  | (BaseField & { type: 'boolean' })
  | (BaseField & { type: 'dateRange'; fromKey: string; toKey: string })
  | (BaseField & { type: 'lookup'; options: Signal<readonly LookupOption[]> });

/** Valor de filtro como vai para a API e para a URL: strings (datas já em LocalDate) e booleanos. */
export type FilterValue = Record<string, string | boolean | undefined>;

/** Chaves de query param que um campo produz (o período produz duas). */
export function fieldKeys(field: FilterField): string[] {
  return field.type === 'dateRange' ? [field.fromKey, field.toKey] : [field.key];
}

/** Filtro → valores do formulário (o p-datepicker trabalha com Date). */
export function filterToForm(fields: readonly FilterField[], filter: FilterValue): Record<string, unknown> {
  const form: Record<string, unknown> = {};
  for (const field of fields) {
    if (field.type === 'boolean') {
      form[field.key] = filter[field.key] === true;
    } else if (field.type === 'dateRange') {
      const from = filter[field.fromKey];
      const to = filter[field.toKey];
      form[field.key] =
        typeof from === 'string' ? [fromLocalDate(from), typeof to === 'string' ? fromLocalDate(to) : null] : null;
    } else {
      form[field.key] = filter[field.key] ?? null;
    }
  }
  return form;
}

/** Valores do formulário → filtro, sem vazios. */
export function formToFilter(fields: readonly FilterField[], raw: Record<string, unknown>): FilterValue {
  const filter: FilterValue = {};
  for (const field of fields) {
    const value = raw[field.key];
    if (field.type === 'boolean') {
      filter[field.key] = value === true;
    } else if (field.type === 'dateRange') {
      const [from, to] = Array.isArray(value) ? (value as (Date | null)[]) : [];
      if (from instanceof Date) filter[field.fromKey] = toLocalDate(from);
      if (to instanceof Date) filter[field.toKey] = toLocalDate(to);
    } else if (field.type === 'text') {
      const text = typeof value === 'string' ? value.trim() : '';
      if (text) filter[field.key] = text;
    } else if (typeof value === 'string' && value) {
      filter[field.key] = value;
    }
  }
  return filter;
}

/** Quantos campos estão diferentes do filtro inicial (contador do botão de filtros no celular). */
export function countActiveFilters(fields: readonly FilterField[], value: FilterValue, initial: FilterValue): number {
  return fields.filter((field) =>
    fieldKeys(field).some((key) => value[key] !== undefined && value[key] !== initial[key]),
  ).length;
}

export function sameFilter(a: object, b: object): boolean {
  return normalize(a) === normalize(b);
}

function normalize(filter: object): string {
  const entries = Object.entries(filter).filter(([, v]) => v !== undefined && v !== null && v !== '');
  return JSON.stringify(entries.sort(([a], [b]) => a.localeCompare(b)));
}
