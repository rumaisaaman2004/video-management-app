import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DataTable } from './DataTable.jsx';

const columns = [
  { key: 'title', header: 'Title', sortable: true },
  { key: 'views', header: 'Views', render: (row) => `${row.views} views` },
];
const rows = [
  { id: 1, title: 'Intro', views: 10 },
  { id: 2, title: 'Basics', views: 20 },
];

function renderTable(props = {}) {
  return render(
    <DataTable
      columns={columns}
      rows={rows}
      getRowKey={(row) => row.id}
      caption="Videos"
      {...props}
    />,
  );
}

describe('DataTable', () => {
  it('renders headers and cells, using custom renderers', () => {
    renderTable();

    const table = screen.getByRole('table', { name: 'Videos' });
    expect(within(table).getAllByRole('row')).toHaveLength(3);
    expect(screen.getByRole('cell', { name: '20 views' })).toBeInTheDocument();
  });

  it('shows a message when there are no rows', () => {
    renderTable({ rows: [], emptyMessage: 'No videos yet.' });

    expect(screen.getByRole('cell', { name: 'No videos yet.' })).toBeInTheDocument();
  });

  it('asks the parent to sort, toggling direction on repeated clicks', async () => {
    const onSortChange = vi.fn();
    const { rerender } = renderTable({ onSortChange });

    await userEvent.click(screen.getByRole('button', { name: /Title/ }));
    expect(onSortChange).toHaveBeenLastCalledWith({ key: 'title', direction: 'asc' });

    rerender(
      <DataTable
        columns={columns}
        rows={rows}
        getRowKey={(row) => row.id}
        caption="Videos"
        sort={{ key: 'title', direction: 'asc' }}
        onSortChange={onSortChange}
      />,
    );
    expect(screen.getByRole('columnheader', { name: /Title/ })).toHaveAttribute(
      'aria-sort',
      'ascending',
    );

    await userEvent.click(screen.getByRole('button', { name: /Title/ }));
    expect(onSortChange).toHaveBeenLastCalledWith({ key: 'title', direction: 'desc' });
  });

  it('does not offer sorting for columns that are not sortable', () => {
    renderTable({ onSortChange: vi.fn() });

    expect(screen.queryByRole('button', { name: /Views/ })).not.toBeInTheDocument();
  });
});
