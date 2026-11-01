/**
 * Builds a parameterized SET clause for a partial update, e.g.
 * `buildSetClause({ name: 'A' }, { name: 'name', description: 'description' })`
 * → `{ setClause: 'name = $1', values: ['A'] }`.
 *
 * Column names come only from the `columns` allow-list, never from the
 * request, so callers cannot inject SQL. Undefined values are skipped;
 * null is kept so a field can be cleared.
 */
export function buildSetClause(changes, columns, firstParamIndex = 1) {
  const assignments = [];
  const values = [];

  for (const [field, column] of Object.entries(columns)) {
    if (changes[field] === undefined) continue;

    values.push(changes[field]);
    assignments.push(`${column} = $${firstParamIndex + values.length - 1}`);
  }

  return { setClause: assignments.join(', '), values };
}
