import { formatCount, formatDuration, formatRelativeDate, pluralize } from './format.js';

describe('formatDuration', () => {
  it.each([
    [0, '0:00'],
    [5, '0:05'],
    [65, '1:05'],
    [3725, '1:02:05'],
    [59.6, '1:00'],
    [null, ''],
  ])('formats %s seconds as %j', (seconds, expected) => {
    expect(formatDuration(seconds)).toBe(expected);
  });
});

describe('formatCount and pluralize', () => {
  it('uses compact notation for large numbers', () => {
    expect(formatCount(999)).toBe('999');
    expect(formatCount(1234)).toBe('1.2K');
    expect(formatCount(2_500_000)).toBe('2.5M');
  });

  it('chooses singular or plural', () => {
    expect(pluralize(1, 'view')).toBe('1 view');
    expect(pluralize(0, 'view')).toBe('0 views');
    expect(pluralize(1500, 'view')).toBe('1.5K views');
  });
});

describe('formatRelativeDate', () => {
  const now = new Date('2026-06-15T12:00:00Z');

  it.each([
    ['2026-06-15T11:59:30Z', 'just now'],
    ['2026-06-15T11:15:00Z', '45 minutes ago'],
    ['2026-06-14T12:00:00Z', 'yesterday'],
    ['2026-06-01T12:00:00Z', '2 weeks ago'],
    ['2025-06-15T12:00:00Z', 'last year'],
  ])('describes %s as %j', (date, expected) => {
    expect(formatRelativeDate(date, now)).toBe(expected);
  });
});
