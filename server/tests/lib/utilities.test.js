import { describe, expect, it } from 'vitest';
import { buildSetClause } from '../../src/db/sql.js';
import { slugify } from '../../src/lib/slugify.js';

describe('slugify', () => {
  it.each([
    ['Web Development', 'web-development'],
    ['  Café & Crème  ', 'cafe-creme'],
    ['C++ for Beginners!', 'c-for-beginners'],
    ['!!!', ''],
  ])('turns %j into %j', (input, expected) => {
    expect(slugify(input)).toBe(expected);
  });
});

describe('buildSetClause', () => {
  const columns = { name: 'name', description: 'description' };

  it('uses only allow-listed columns, ignoring unknown keys', () => {
    const result = buildSetClause({ name: 'A', role: 'admin', 'x; DROP TABLE users': 1 }, columns);

    expect(result).toEqual({ setClause: 'name = $1', values: ['A'] });
  });

  it('keeps null so fields can be cleared, and skips undefined', () => {
    const result = buildSetClause({ name: undefined, description: null }, columns, 2);

    expect(result).toEqual({ setClause: 'description = $2', values: [null] });
  });
});
