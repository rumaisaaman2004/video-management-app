import { useSearchParams } from 'react-router';

function readPage(value) {
  const page = Number.parseInt(value, 10);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

/**
 * List state (search, filters, sort, page) kept in the URL, so it can be
 * bookmarked or shared and the Back button undoes a change.
 *
 * `get(key)` returns a value or "". `update(changes)` sets values ("" removes one)
 * and returns to page 1 unless `page` is part of the change. Pass
 * `{ replace: true }` for rapid changes (typing) so history is not flooded.
 */
export function useSearchParamsState() {
  const [searchParams, setSearchParams] = useSearchParams();

  function get(key) {
    return searchParams.get(key) ?? '';
  }

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

  return { get, page: readPage(searchParams.get('page')), update };
}
