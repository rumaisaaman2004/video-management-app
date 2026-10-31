import Table from 'react-bootstrap/Table';

const ARIA_SORT = { asc: 'ascending', desc: 'descending' };

function nextSort(key, currentSort) {
  const isSameColumn = currentSort?.key === key;
  return { key, direction: isSameColumn && currentSort.direction === 'asc' ? 'desc' : 'asc' };
}

/**
 * A responsive table driven by a column list:
 * `{ key, header, render?(row), sortable?, className? }`.
 *
 * Sorting is controlled by the parent (usually done by the API): pass `sort`
 * ({ key, direction }) and `onSortChange`.
 */
export function DataTable({
  columns,
  rows,
  getRowKey,
  caption,
  sort,
  onSortChange,
  emptyMessage = 'Nothing to show yet.',
}) {
  return (
    <Table responsive hover className="align-middle">
      <caption className="visually-hidden">{caption}</caption>
      <thead>
        <tr>
          {columns.map((column) => {
            const isSortable = column.sortable && onSortChange;
            const isSorted = sort?.key === column.key;
            return (
              <th
                key={column.key}
                scope="col"
                className={column.className}
                aria-sort={isSortable ? (isSorted ? ARIA_SORT[sort.direction] : 'none') : undefined}
              >
                {isSortable ? (
                  <button
                    type="button"
                    className="btn btn-link p-0 fw-semibold text-reset text-decoration-none"
                    onClick={() => onSortChange(nextSort(column.key, sort))}
                  >
                    {column.header}
                    <i
                      className={`bi ms-1 ${
                        isSorted
                          ? `bi-sort-${sort.direction === 'asc' ? 'up' : 'down'}`
                          : 'bi-arrow-down-up text-body-tertiary'
                      }`}
                      aria-hidden="true"
                    />
                  </button>
                ) : (
                  column.header
                )}
              </th>
            );
          })}
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <tr>
            <td colSpan={columns.length} className="text-center text-body-secondary py-4">
              {emptyMessage}
            </td>
          </tr>
        ) : (
          rows.map((row) => (
            <tr key={getRowKey(row)}>
              {columns.map((column) => (
                <td key={column.key} className={column.className}>
                  {column.render ? column.render(row) : row[column.key]}
                </td>
              ))}
            </tr>
          ))
        )}
      </tbody>
    </Table>
  );
}
