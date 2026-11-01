import { useSearchParams } from 'react-router';

export const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'oldest', label: 'Oldest' },
  { value: 'popular', label: 'Most viewed' },
  { value: 'title', label: 'Title A–Z' },
];
// Only offered while searching, because it ranks by how well videos match the words.
export const RELEVANCE_SORT = { value: 'relevance', label: 'Best match' };

const FILTER_KEYS = ['q', 'category', 'tag', 'sort'];

function readPage(value) {
  const page = Number.parseInt(value, 10);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

/**
 * The library's search, filters, sort and page, stored in the URL so they can be
 * bookmarked or shared and the Back button undoes a change.
 */
export function useLibraryParams() {
  const [searchParams, setSearchParams] = useSearchParams();

  const q = searchParams.get('q') ?? '';
  const sortOptions = q ? [RELEVANCE_SORT, ...SORT_OPTIONS] : SORT_OPTIONS;
  const requestedSort = searchParams.get('sort');
  const isKnownSort = sortOptions.some((option) => option.value === requestedSort);

  const params = {
    q,
    category: searchParams.get('category') ?? '',
    tag: searchParams.get('tag') ?? '',
    // Unknown values in hand-edited URLs fall back to the default ordering.
    sort: isKnownSort ? requestedSort : q ? RELEVANCE_SORT.value : 'newest',
    page: readPage(searchParams.get('page')),
  };

  const hasFilters = Boolean(params.q || params.category || params.tag);

  /**
   * Applies changes, e.g. `update({ category: 'design' })`. Changing a filter returns to
   * page 1. Pass `{ replace: true }` for rapid changes (typing) so history is not flooded.
   */
  function update(changes, { replace = false } = {}) {
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        for (const [key, value] of Object.entries(changes)) {
          if (value === '' || value === null || value === undefined) next.delete(key);
          else next.set(key, String(value));
        }
        if (!('page' in changes)) next.delete('page');
        if (next.get('page') === '1') next.delete('page');
        return next;
      },
      { replace },
    );
  }

  function clearFilters() {
    update(Object.fromEntries(FILTER_KEYS.map((key) => [key, ''])));
  }

  return { params, sortOptions, hasFilters, update, clearFilters };
}
