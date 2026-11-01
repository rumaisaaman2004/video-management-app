/**
 * After removing a video: go back a page if that emptied the current one,
 * otherwise reload it.
 */
export function refreshAfterRemoval({ videos, page, update }) {
  const wasLastOnPage = videos.data?.data.length === 1;
  if (wasLastOnPage && page > 1) update({ page: page - 1 });
  else videos.reload();
}
