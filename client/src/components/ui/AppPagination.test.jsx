import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppPagination } from './AppPagination.jsx';

describe('AppPagination', () => {
  it('renders nothing for a single page', () => {
    const { container } = render(<AppPagination page={1} totalPages={1} onPageChange={vi.fn()} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('marks the current page and changes page on click', async () => {
    const onPageChange = vi.fn();
    render(<AppPagination page={2} totalPages={5} onPageChange={onPageChange} />);

    expect(screen.getByRole('navigation', { name: 'Pagination' })).toBeInTheDocument();
    expect(screen.getByText('2').closest('[aria-current]')).toHaveAttribute('aria-current', 'page');

    await userEvent.click(screen.getByRole('button', { name: 'Page 4' }));
    await userEvent.click(screen.getByRole('button', { name: 'Next page' }));

    expect(onPageChange.mock.calls).toEqual([[4], [3]]);
  });

  it('disables "Previous" on the first page', () => {
    render(<AppPagination page={1} totalPages={5} onPageChange={vi.fn()} />);

    expect(screen.queryByRole('button', { name: 'Previous page' })).not.toBeInTheDocument();
  });
});
