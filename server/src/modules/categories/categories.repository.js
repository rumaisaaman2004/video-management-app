import { buildSetClause } from '../../db/sql.js';

// videoCount includes only videos visitors can actually watch.
const SELECT_CATEGORIES = `
  SELECT c.id, c.name, c.slug, c.description,
         count(v.id) FILTER (WHERE v.status = 'ready' AND v.visibility = 'public') AS "videoCount",
         c.created_at AS "createdAt", c.updated_at AS "updatedAt"
  FROM categories c
  LEFT JOIN videos v ON v.category_id = c.id`;

const UPDATABLE_COLUMNS = { name: 'name', slug: 'slug', description: 'description' };

/** Data access for categories. `db` is the pool or a transaction client. */
export function createCategoriesRepository(db) {
  return {
    async findAll() {
      const { rows } = await db.query(`${SELECT_CATEGORIES} GROUP BY c.id ORDER BY c.name`);
      return rows;
    },

    async findById(id) {
      const { rows } = await db.query(`${SELECT_CATEGORIES} WHERE c.id = $1 GROUP BY c.id`, [id]);
      return rows[0] ?? null;
    },

    /** Returns the new category's ID. */
    async create({ name, slug, description }) {
      const { rows } = await db.query(
        'INSERT INTO categories (name, slug, description) VALUES ($1, $2, $3) RETURNING id',
        [name, slug, description ?? null],
      );
      return rows[0].id;
    },

    /** Returns false if no category has the given ID. */
    async update(id, changes) {
      const { setClause, values } = buildSetClause(changes, UPDATABLE_COLUMNS, 2);
      const { rowCount } = await db.query(`UPDATE categories SET ${setClause} WHERE id = $1`, [
        id,
        ...values,
      ]);
      return rowCount > 0;
    },

    /** Returns false if no category has the given ID. */
    async delete(id) {
      const { rowCount } = await db.query('DELETE FROM categories WHERE id = $1', [id]);
      return rowCount > 0;
    },
  };
}
