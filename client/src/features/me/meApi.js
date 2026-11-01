import { api } from '../../lib/apiClient.js';

export const PERSONAL_PAGE_SIZE = 12;

/** The signed-in user's favourites (saved videos), most recently saved first. */
export function listFavourites({ page }, signal) {
  return api.get('/me/bookmarks', {
    query: { page, pageSize: PERSONAL_PAGE_SIZE },
    signal,
  });
}

/**
 * The signed-in user's watch history, most recently watched first.
 * `inProgress` limits it to videos started but not finished ("Continue watching").
 */
export function listHistory({ page, inProgress = false, pageSize = PERSONAL_PAGE_SIZE }, signal) {
  return api.get('/me/history', {
    query: { page, pageSize, inProgress: inProgress ? 'true' : undefined },
    signal,
  });
}

export function removeFromHistory(videoId) {
  return api.delete(`/me/history/${videoId}`);
}

export function clearHistory() {
  return api.delete('/me/history');
}
