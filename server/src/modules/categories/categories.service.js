import { AppError } from '../../errors/AppError.js';
import { isUniqueViolation } from '../../errors/databaseErrors.js';
import { slugify } from '../../lib/slugify.js';
import { createCategoriesRepository } from './categories.repository.js';

const DUPLICATE_MESSAGES = {
  categories_name_key: 'A category with this name already exists',
  categories_slug_key: 'A category with this slug already exists',
};

/** Turns a unique-constraint error into a 409 that names the duplicated field. */
async function withDuplicateCheck(operation) {
  try {
    return await operation();
  } catch (err) {
    if (isUniqueViolation(err)) {
      throw AppError.conflict(DUPLICATE_MESSAGES[err.constraint] ?? 'Category already exists');
    }
    throw err;
  }
}

export function createCategoriesService({ pool }) {
  const categories = createCategoriesRepository(pool);

  async function getById(id) {
    const category = await categories.findById(id);
    if (!category) throw AppError.notFound('Category not found');
    return category;
  }

  return {
    list() {
      return categories.findAll();
    },

    getById,

    async create({ name, slug, description }) {
      const finalSlug = slug ?? slugify(name);
      if (!finalSlug) {
        throw AppError.validation([
          { field: 'body.slug', message: 'Could not generate a slug from the name; provide one' },
        ]);
      }

      const id = await withDuplicateCheck(() =>
        categories.create({ name, slug: finalSlug, description }),
      );
      return getById(id);
    },

    async update(id, changes) {
      const updated = await withDuplicateCheck(() => categories.update(id, changes));
      if (!updated) throw AppError.notFound('Category not found');
      return getById(id);
    },

    async delete(id) {
      const deleted = await categories.delete(id);
      if (!deleted) throw AppError.notFound('Category not found');
    },
  };
}
