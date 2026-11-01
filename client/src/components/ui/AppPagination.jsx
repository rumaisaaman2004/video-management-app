import Pagination from 'react-bootstrap/Pagination';
import { getPageItems } from '../../lib/pagination.js';

/** Page navigation; renders nothing when everything fits on one page. */
export function AppPagination({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;

  return (
    <nav aria-label="Pagination" className="d-flex justify-content-center mt-4">
      <Pagination className="mb-0">
        <Pagination.Prev
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="Previous page"
        />
        {getPageItems(page, totalPages).map((item) =>
          typeof item === 'number' ? (
            <Pagination.Item
              key={item}
              active={item === page}
              onClick={() => onPageChange(item)}
              aria-label={`Page ${item}`}
              // The label hides Bootstrap's "(current)" text, so mark the page explicitly.
              aria-current={item === page ? 'page' : undefined}
            >
              {item}
            </Pagination.Item>
          ) : (
            <Pagination.Ellipsis key={item} disabled />
          ),
        )}
        <Pagination.Next
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          aria-label="Next page"
        />
      </Pagination>
    </nav>
  );
}
