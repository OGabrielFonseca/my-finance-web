import type { FieldError } from '@shared/data/api-error';

import type { MockResult } from './mock-http';
import { problem } from './mock-http';

/** Regras equivalentes às anotações do Bean Validation nos requests do backend. */
export type Rule = 'required' | 'positive' | { maxLength: number } | { minLength: number } | { pattern: RegExp };

const isBlank = (value: unknown) =>
  value === null || value === undefined || (typeof value === 'string' && !value.trim());

function check(value: unknown, rule: Rule): string | null {
  if (rule === 'required') return isBlank(value) ? 'não deve estar em branco' : null;
  if (rule === 'positive') return typeof value === 'number' && value <= 0 ? 'deve ser maior que 0' : null;
  if (typeof value !== 'string' || value === '') return null;
  if ('maxLength' in rule && value.length > rule.maxLength) return `tamanho deve ser entre 0 e ${rule.maxLength}`;
  if ('minLength' in rule && value.length < rule.minLength) return `tamanho deve ser no mínimo ${rule.minLength}`;
  if ('pattern' in rule && !rule.pattern.test(value)) return `deve corresponder a "${rule.pattern.source}"`;
  return null;
}

/** Devolve 400 common.VALIDATION_ERROR com os erros de campo, ou null se estiver tudo certo. */
export function validate(body: unknown, rules: Record<string, Rule[]>): MockResult | null {
  const data = (body ?? {}) as Record<string, unknown>;
  const errors: FieldError[] = [];
  for (const [field, fieldRules] of Object.entries(rules)) {
    for (const rule of fieldRules) {
      const message = check(data[field], rule);
      if (message) {
        errors.push({ field, message });
        break;
      }
    }
  }
  return errors.length ? problem(400, 'common.VALIDATION_ERROR', 'Dados inválidos.', errors) : null;
}
