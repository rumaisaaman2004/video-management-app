// Up to this many pages are shown in full; longer ranges collapse with ellipses.
const MAX_FULL_PAGES = 7;

/**
 * Page numbers to show around the current page, always including the first
 * and last: getPageItems(6, 20) → [1, "start-ellipsis", 5, 6, 7, "end-ellipsis", 20].
 * An ellipsis that would hide a single page shows that page instead.
 */
export function getPageItems(currentPage, totalPages) {
  if (totalPages <= MAX_FULL_PAGES) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);
  const items = [1];

  if (start > 2) items.push(start === 3 ? 2 : 'start-ellipsis');
  for (let page = start; page <= end; page += 1) items.push(page);
  if (end < totalPages - 1) items.push(end === totalPages - 2 ? totalPages - 1 : 'end-ellipsis');

  items.push(totalPages);
  return items;
}
