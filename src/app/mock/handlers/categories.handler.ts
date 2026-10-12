import type { MockDb } from '../mock-db';
import { businessError, created, noContent, notFound, ok } from '../mock-http';
import { toCategorySummary } from '../mock-mappers';
import { contains, matchesBoolean, paginate } from '../mock-page';
import type { MockRequest, MockRoute } from '../mock-router';
import type { Category, CategoryType } from '../mock-types';
import type { Rule } from '../mock-validation';
import { validate } from '../mock-validation';
import { newId } from '../seed/seed-ids';

const sortable = { name: (c: Category) => c.name, type: (c: Category) => c.type };
const TYPE_LABEL: Record<CategoryType, string> = { INCOME: 'receita', EXPENSE: 'despesa' };

const rules: Record<string, Rule[]> = {
  name: ['required', { maxLength: 60 }],
  color: [{ pattern: /^#[0-9A-Fa-f]{6}$/ }],
  icon: [{ maxLength: 50 }],
};

function filtered(req: MockRequest, db: MockDb, includeSystem: boolean): Category[] {
  const type = req.query.get('type');
  return db.categories.filter(
    (c) =>
      (includeSystem || !c.system) &&
      (!type || c.type === type) &&
      matchesBoolean(c.archived, req.query.get('archived')) &&
      contains(c.name, req.query.get('name')),
  );
}

function duplicated(db: MockDb, name: string, type: CategoryType, parentId: string | null, ignoreId?: string) {
  const normalized = name.trim().toLocaleLowerCase('pt-BR');
  return db.categories.some(
    (c) =>
      c.id !== ignoreId &&
      c.type === type &&
      c.parentId === parentId &&
      c.name.toLocaleLowerCase('pt-BR') === normalized,
  );
}

const nameExists = (name: string) =>
  businessError('category.NAME_ALREADY_EXISTS', `Já existe uma categoria com o nome ${name} neste nível.`);

export const categoryRoutes: MockRoute[] = [
  {
    method: 'GET',
    pattern: '/categories',
    handler: (req, db) => paginate(filtered(req, db, true), req.query, sortable, 'name,asc'),
  },
  {
    method: 'GET',
    pattern: '/categories/options',
    handler: (req, db) => paginate(filtered(req, db, false), req.query, sortable, 'name,asc', toCategorySummary),
  },
  {
    method: 'POST',
    pattern: '/categories',
    handler: (req, db) => {
      const invalid = validate(req.body, rules);
      if (invalid) return invalid;
      const body = req.body as { name: string; type?: CategoryType; parentId?: string; color?: string; icon?: string };
      const parent = body.parentId ? db.categories.find((c) => c.id === body.parentId) : undefined;
      if (body.parentId && !parent) return notFound();
      if (parent?.parentId) {
        return businessError(
          'category.SUBCATEGORY_DEPTH_EXCEEDED',
          'Subcategoria não pode ter subcategorias (máximo de 2 níveis).',
        );
      }
      if (parent && body.type && body.type !== parent.type) {
        return businessError(
          'category.SUBCATEGORY_TYPE_MISMATCH',
          `Subcategoria herda o tipo da categoria pai (${TYPE_LABEL[parent.type]}).`,
        );
      }
      const type = parent?.type ?? body.type;
      if (!type) return businessError('category.TYPE_REQUIRED', 'Informe o tipo da categoria (receita ou despesa).');
      if (duplicated(db, body.name, type, parent?.id ?? null)) return nameExists(body.name.trim());

      const now = new Date().toISOString();
      const category: Category = {
        id: newId(),
        parentId: parent?.id ?? null,
        name: body.name.trim(),
        type,
        color: body.color ?? parent?.color ?? null,
        icon: body.icon ?? parent?.icon ?? null,
        archived: false,
        system: false,
        createdAt: now,
        updatedAt: now,
      };
      db.categories.push(category);
      return created(category);
    },
  },
  {
    method: 'PUT',
    pattern: '/categories/:id',
    handler: (req, db) => {
      const category = db.categories.find((c) => c.id === req.params['id']);
      if (!category) return notFound();
      if (category.system) {
        return businessError(
          'category.SYSTEM_CATEGORY',
          'Categoria de sistema não pode ser alterada nem usada diretamente.',
        );
      }
      const invalid = validate(req.body, rules);
      if (invalid) return invalid;
      const body = req.body as { name: string; color?: string; icon?: string };
      if (duplicated(db, body.name, category.type, category.parentId, category.id)) return nameExists(body.name.trim());
      Object.assign(category, {
        name: body.name.trim(),
        color: body.color ?? null,
        icon: body.icon ?? null,
        updatedAt: new Date().toISOString(),
      });
      return ok(category);
    },
  },
  {
    method: 'PATCH',
    pattern: '/categories/:id/archive',
    handler: (req, db) => {
      const category = db.categories.find((c) => c.id === req.params['id']);
      if (!category) return notFound();
      if (category.system) {
        return businessError(
          'category.SYSTEM_CATEGORY',
          'Categoria de sistema não pode ser alterada nem usada diretamente.',
        );
      }
      category.archived = true;
      return noContent();
    },
  },
];
