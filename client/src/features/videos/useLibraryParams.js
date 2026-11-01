import { useSearchParamsState } from '../../hooks/useSearchParamsState.js';

export const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'oldest', label: 'Oldest' },
  { value: 'popular', label: 'Most viewed' },
  { value: 'title', label: 'Title A–Z' },
];
// Only offered while searching, because it ranks by how well videos match the words.
export const RELEVANCE_SORT = { value: 'relevance', label: 'Best match' };

const FILTER_KEYS = ['q', 'category', 'tag', 'sort'];

/** The library's search, filters, sort and page, kept in the URL. */
export function useLibraryParams() {
  const { get, page, update } = useSearchParamsState();

  const q = get('q');
  const sortOptions = q ? [RELEVANCE_SORT, ...SORT_OPTIONS] : SORT_OPTIONS;
  const requestedSort = get('sort');
  const isKnownSort = sortOptions.some((option) => option.value === requestedSort);

  const params = {
    q,
    category: get('category'),
    tag: get('tag'),
    // Unknown values in hand-edited URLs fall back to the default ordering.
    sort: isKnownSort ? requestedSort : q ? RELEVANCE_SORT.value : 'newest',
    page,
  };

  const hasFilters = Boolean(params.q || params.category || params.tag);

  function clearFilters() {
    update(Object.fromEntries(FILTER_KEYS.map((key) => [key, ''])));
  }

  return { params, sortOptions, hasFilters, update, clearFilters };
}
