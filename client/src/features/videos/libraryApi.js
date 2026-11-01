import { api } from '../../lib/apiClient.js';

export const LIBRARY_PAGE_SIZE = 12;

/**
 * One page of the public library: `{ data: videos, meta: { page, total, totalPages } }`.
 * Always asks for ready, public videos, so admins see the same library as everyone else;
 * unprocessed and private videos belong in the admin video table.
 */
export function listLibraryVideos({ q, category, tag, sort, page }, signal) {
  return api.get('/videos', {
    query: {
      q,
      category,
      tag,
      sort,
      page,
      pageSize: LIBRARY_PAGE_SIZE,
      status: 'ready',
      visibility: 'public',
    },
    signal,
  });
}

export async function listCategories(signal) {
  return (await api.get('/categories', { signal })).data;
}

export async function listTags(signal) {
  return (await api.get('/tags', { signal })).data;
}
